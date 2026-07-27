/**
 * Onboarding Page
 * 3-step guided onboarding: Connect platforms, create first post, success.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import Header from '@/components/ui/Header';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAnalytics } from '@/hooks/useAnalytics';
import { apiClient } from '@/lib/api-client';
import { platforms as platformCatalog } from '@/lib/config/platforms';
import styles from '@/styles/Onboarding.module.css';

interface Platform {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  comingSoon: boolean;
}

const PLATFORM_ICONS: Record<string, string> = {
  facebook: 'f',
  instagram: 'ig',
  linkedin: 'in',
  twitter: 'X',
};

const INITIAL_PLATFORMS: Platform[] = platformCatalog
  .filter(platform => ['facebook', 'instagram', 'linkedin', 'twitter'].includes(platform.slug))
  .map(platform => ({
    id: platform.slug,
    name: platform.name,
    icon: PLATFORM_ICONS[platform.slug] ?? platform.name.charAt(0),
    connected: false,
    comingSoon: Boolean(platform.comingSoon),
  }));

const TOTAL_STEPS = 3;

function StepConnectPlatforms({
  platforms,
  onToggleConnect,
}: {
  readonly platforms: Platform[];
  readonly onToggleConnect: (id: string) => void;
}) {
  return (
    <>
      <h2 className={styles.stepTitle}>Connect Your First Platform</h2>
      <p className={styles.stepDescription}>
        Choose the platforms where you want to publish your content.
      </p>
      <div className={styles.platformGrid}>
        {platforms.map(platform => (
          <button
            key={platform.id}
            type="button"
            className={`${styles.platformCard} ${platform.connected ? styles.platformCardConnected : ''}`}
            onClick={() => onToggleConnect(platform.id)}
            aria-label={`Connect ${platform.name}`}
            aria-pressed={platform.connected}
            disabled={platform.comingSoon}
          >
            <span className={styles.platformIcon}>{platform.icon}</span>
            <span className={styles.platformName}>{platform.name}</span>
            {platform.comingSoon ? (
              <span className={styles.platformStatus}>Coming Soon</span>
            ) : platform.connected ? (
              <span className={styles.platformStatus}>Connected</span>
            ) : (
              <span className={styles.connectButton}>Connect</span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

function StepCreatePost({
  postContent,
  onPostChange,
  selectedPlatforms,
  onTogglePlatform,
  platforms,
}: {
  readonly postContent: string;
  readonly onPostChange: (value: string) => void;
  readonly selectedPlatforms: Set<string>;
  readonly onTogglePlatform: (id: string) => void;
  readonly platforms: Platform[];
}) {
  return (
    <>
      <h2 className={styles.stepTitle}>Prepare Your First Draft</h2>
      <p className={styles.stepDescription}>
        Sketch content for a platform that is actually connected to this account. Nothing is
        published or saved as a post from onboarding.
      </p>
      <textarea
        className={styles.postTextarea}
        placeholder="What would you like to share?"
        value={postContent}
        onChange={e => onPostChange(e.target.value)}
        aria-label="Post content"
      />
      <fieldset className={styles.platformCheckboxes}>
        <legend>Select platforms</legend>
        {!platforms.some(platform => platform.connected) && (
          <p className={styles.stepDescription}>
            No supported platform is connected. Return to Platform Connections to connect X.
          </p>
        )}
        {platforms
          .filter(platform => platform.connected)
          .map(platform => (
            <label key={platform.id} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={selectedPlatforms.has(platform.id)}
                onChange={() => onTogglePlatform(platform.id)}
              />
              {platform.name}
            </label>
          ))}
      </fieldset>
    </>
  );
}

function StepSuccess() {
  return (
    <div className={styles.successContainer}>
      <div className={styles.successIcon}>&#10003;</div>
      <h2 className={styles.stepTitle}>You&apos;re All Set!</h2>
      <p className={styles.successMessage}>
        Your account is ready. Head to the dashboard to start managing your content and publishing
        across platforms.
      </p>
    </div>
  );
}

function ProgressIndicator({ currentStep }: { readonly currentStep: number }) {
  return (
    <div className={styles.progressBar} aria-live="polite">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const stepNum = i + 1;
        let stepClass = styles.progressStep;
        if (stepNum === currentStep) {
          stepClass += ` ${styles.progressStepActive}`;
        } else if (stepNum < currentStep) {
          stepClass += ` ${styles.progressStepCompleted}`;
        }

        return (
          <React.Fragment key={stepNum}>
            {i > 0 && (
              <div
                className={`${styles.progressLine} ${stepNum <= currentStep ? styles.progressLineActive : ''}`}
              />
            )}
            <div className={stepClass}>{stepNum}</div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { trackOnboardingStep } = useAnalytics({
    trackPageView: true,
  });
  const [step, setStep] = useState(1);
  const [platforms, setPlatforms] = useState<Platform[]>(INITIAL_PLATFORMS);
  const [postContent, setPostContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) return;
    void apiClient
      .get<{
        connections: {
          twitter: { connected: boolean; configured: boolean; status: string };
        };
      }>('/api/platforms/connections')
      .then(response => {
        const xReady =
          response.connections.twitter.connected &&
          response.connections.twitter.configured &&
          response.connections.twitter.status === 'connected';
        setPlatforms(current =>
          current.map(platform =>
            platform.id === 'twitter'
              ? { ...platform, connected: xReady }
              : { ...platform, connected: false }
          )
        );
        setSelectedPlatforms(current =>
          xReady && current.has('twitter') ? new Set(['twitter']) : new Set()
        );
      })
      .catch(() => {
        setPlatforms(current => current.map(platform => ({ ...platform, connected: false })));
        setSelectedPlatforms(new Set());
      });
  }, [isAuthenticated]);

  // Restore progress from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('onboarding-progress');
      if (saved) {
        const data = JSON.parse(saved) as {
          step: number;
          postContent: string;
          selectedPlatforms: string[];
        };
        if (data.step) setStep(data.step);
        if (data.postContent) setPostContent(data.postContent);
        if (data.selectedPlatforms) setSelectedPlatforms(new Set(data.selectedPlatforms));
      }
    } catch {
      // Ignore parse errors from corrupt sessionStorage data
    }
  }, []);

  // Redirect unauthenticated users to signup
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/signup');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleToggleConnect = (platformId: string) => {
    const platform = platforms.find(item => item.id === platformId);
    if (!platform || platform.comingSoon || platform.connected) return;
    router.push('/settings/platforms');
  };

  const handleTogglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(platformId)) {
        next.delete(platformId);
      } else {
        next.add(platformId);
      }
      return next;
    });
  };

  const saveProgress = (nextStep: number) => {
    try {
      sessionStorage.setItem(
        'onboarding-progress',
        JSON.stringify({
          step: nextStep,
          postContent,
          selectedPlatforms: Array.from(selectedPlatforms),
        })
      );
    } catch {
      // Ignore sessionStorage write errors
    }
  };

  const handleNext = () => {
    const stepNames = ['connect-platforms', 'create-post', 'complete'];
    trackOnboardingStep(step, stepNames[step - 1] || 'unknown', false);

    if (step < TOTAL_STEPS) {
      const nextStep = step + 1;
      saveProgress(nextStep);
      setStep(nextStep);
    } else {
      sessionStorage.removeItem('onboarding-progress');
      router.push('/dashboard');
    }
  };

  const handleSkip = () => {
    const stepNames = ['connect-platforms', 'create-post', 'complete'];
    trackOnboardingStep(step, stepNames[step - 1] || 'unknown', true);

    if (step < TOTAL_STEPS) {
      const nextStep = step + 1;
      saveProgress(nextStep);
      setStep(nextStep);
    } else {
      sessionStorage.removeItem('onboarding-progress');
      router.push('/dashboard');
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.loadingContainer}>
            <LoadingSpinner size="lg" label="Loading..." />
          </div>
        </main>
      </>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <ProgressIndicator currentStep={step} />

          {step === 1 && (
            <StepConnectPlatforms platforms={platforms} onToggleConnect={handleToggleConnect} />
          )}

          {step === 2 && (
            <StepCreatePost
              postContent={postContent}
              onPostChange={setPostContent}
              selectedPlatforms={selectedPlatforms}
              onTogglePlatform={handleTogglePlatform}
              platforms={platforms}
            />
          )}

          {step === 3 && <StepSuccess />}

          <div className={styles.buttonRow}>
            {step < TOTAL_STEPS ? (
              <>
                <button type="button" className={styles.skipButton} onClick={handleSkip}>
                  Skip
                </button>
                <button type="button" className={styles.primaryButton} onClick={handleNext}>
                  Continue
                </button>
              </>
            ) : (
              <>
                <span />
                <button type="button" className={styles.primaryButton} onClick={handleNext}>
                  Go to Dashboard
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
