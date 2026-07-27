/**
 * Content Creation Page
 * Multi-step flow: Write Content -> Platform Adaptation -> Schedule/Publish
 */

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAnalytics } from '@/hooks/useAnalytics';
import { apiClient } from '@/lib/api-client';
import { platforms } from '@/lib/config/platforms';
import { DEFAULT_PLATFORM_CONFIGS } from '@/types/campaign';
import type { PostStatus } from '@/types/campaign';
import type { JobType } from '@/lib/scheduler/types';
import { CONTENT_STORAGE_KEY, type StoredContent } from '@/lib/content/local-content';
import styles from '@/styles/ContentCreate.module.css';

// ── Constants ───────────────────────────────────────────────────────────────

const STEPS = ['Write Content', 'Platform Adaptation', 'Schedule'] as const;
/** Character limits per platform slug */
const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  twitter: 280,
  linkedin: 3000,
  facebook: 63206,
  instagram: 2200,
  tiktok: 2200,
  'custom-channel': 5000,
};

// ── Types ───────────────────────────────────────────────────────────────────

interface PlatformState {
  slug: string;
  name: string;
  enabled: boolean;
  connected: boolean;
  hashtags: string;
  comingSoon?: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `content_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function truncateContent(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit - 3) + '...';
}

function getCharColor(current: number, limit: number): 'green' | 'yellow' | 'red' {
  const ratio = current / limit;
  if (ratio <= 0.8) return 'green';
  if (ratio <= 1) return 'yellow';
  return 'red';
}

function loadDrafts(): StoredContent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(CONTENT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredContent[]) : [];
  } catch {
    return [];
  }
}

function saveDrafts(drafts: StoredContent[]): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify(drafts));
}

// ── Component ───────────────────────────────────────────────────────────────

export function ContentCreatePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { track, trackPostPublished, events } = useAnalytics();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Step state
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Write Content
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [summary, setSummary] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  // Step 2: Platform Adaptation
  const [platformStates, setPlatformStates] = useState<PlatformState[]>(() =>
    platforms
      .filter(p => p.slug !== 'custom-channel')
      .map(p => ({
        slug: p.slug,
        name: p.name,
        enabled: false,
        connected: false,
        hashtags: (DEFAULT_PLATFORM_CONFIGS[p.slug]?.defaultHashtags ?? []).join(', '),
        comingSoon: p.comingSoon,
      }))
  );

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
        setPlatformStates(previous =>
          previous.map(platform => ({
            ...platform,
            connected: platform.slug === 'twitter' && xReady,
            enabled: platform.slug === 'twitter' && xReady,
          }))
        );
      })
      .catch(() => {
        setPlatformStates(previous =>
          previous.map(platform => ({ ...platform, connected: false, enabled: false }))
        );
      });
  }, [isAuthenticated]);

  // Step 3: Schedule
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now');
  const [scheduledTime, setScheduledTime] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // ── Derived values ──────────────────────────────────────────────────────

  const enabledPlatforms = useMemo(() => platformStates.filter(p => p.enabled), [platformStates]);

  const canProceedStep1 = title.trim().length > 0 && body.trim().length > 0;
  const canProceedStep2 = enabledPlatforms.length > 0;
  const canPublish =
    enabledPlatforms.length > 0 &&
    (scheduleMode === 'now' || (scheduleMode === 'schedule' && scheduledTime.length > 0));

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleSummarize = useCallback(async () => {
    if (!body.trim()) return;
    setSummarizing(true);
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: body }),
      });
      if (response.ok) {
        const data = (await response.json()) as { summary: string };
        setSummary(data.summary);
        setSummaryOpen(true);
        track(events.FEATURE_USED, { featureName: 'ai_summarize', context: 'content_create' });
      }
    } catch {
      // Silently fail for alpha -- the user can try again
    } finally {
      setSummarizing(false);
    }
  }, [body, track, events]);

  const togglePlatform = useCallback((slug: string) => {
    setPlatformStates(prev =>
      prev.map(p =>
        p.slug === slug && !p.comingSoon && p.connected ? { ...p, enabled: !p.enabled } : p
      )
    );
  }, []);

  const updateHashtags = useCallback((slug: string, value: string) => {
    setPlatformStates(prev => prev.map(p => (p.slug === slug ? { ...p, hashtags: value } : p)));
  }, []);

  const saveDraft = useCallback(() => {
    const drafts = loadDrafts();
    const draft: StoredContent = {
      id: generateId(),
      title,
      body,
      summary,
      platforms: platformStates,
      status: 'pending',
      scheduledTime: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveDrafts([draft, ...drafts]);
    track(events.POST_CREATED, {
      platformCount: enabledPlatforms.length,
      platformNames: enabledPlatforms.map(p => p.name),
      status: 'draft',
    });
    router.push('/content');
  }, [title, body, summary, platformStates, enabledPlatforms, track, events, router]);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    setPublishError(null);
    const time =
      scheduleMode === 'now' ? new Date().toISOString() : new Date(scheduledTime).toISOString();
    const status: PostStatus = scheduleMode === 'now' ? 'queued' : 'scheduled';
    const contentId = generateId();

    try {
      // Create a scheduler job for each enabled platform
      const jobPromises = enabledPlatforms.map(async platform => {
        const charLimit = PLATFORM_CHAR_LIMITS[platform.slug] ?? 5000;
        const adaptedText = truncateContent(body, charLimit);
        const hashtags = platform.hashtags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);

        const jobPayload = {
          type: 'standalone' as JobType,
          contentId,
          platformId: platform.slug,
          content: {
            text: adaptedText,
            hashtags: hashtags.length > 0 ? hashtags : undefined,
          },
          scheduledTime: time,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };

        const response = await fetch('/api/scheduler', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jobPayload),
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => ({}))) as {
            error?: string;
            message?: string;
          };
          throw new Error(
            errorBody.error ||
              errorBody.message ||
              `Scheduler rejected the request (${response.status})`
          );
        }

        const payload = (await response.json()) as { job?: { id?: string } };
        if (!payload.job?.id) throw new Error('Scheduler did not return a job ID');
        return payload.job.id;
      });

      const schedulerJobIds = await Promise.all(jobPromises);

      // Save to sessionStorage as well
      const drafts = loadDrafts();
      const draft: StoredContent = {
        id: contentId,
        title,
        body,
        summary,
        platforms: platformStates,
        status,
        scheduledTime: time,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schedulerJobIds,
      };
      saveDrafts([draft, ...drafts]);

      trackPostPublished(
        enabledPlatforms.map(p => p.name),
        loadDrafts().length <= 1
      );
      track(events.POST_CREATED, {
        platformCount: enabledPlatforms.length,
        platformNames: enabledPlatforms.map(p => p.name),
        status,
      });

      router.push('/content');
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : 'Failed to queue the post');
    } finally {
      setPublishing(false);
    }
  }, [
    scheduleMode,
    scheduledTime,
    enabledPlatforms,
    body,
    title,
    summary,
    platformStates,
    track,
    trackPostPublished,
    events,
    router,
  ]);

  // ── Render helpers ──────────────────────────────────────────────────────

  function renderProgressBar() {
    return (
      <div className={styles.progressBar} role="navigation" aria-label="Creation steps">
        {STEPS.map((label, i) => {
          const stepState = i < currentStep ? 'completed' : i === currentStep ? 'active' : '';
          return (
            <div key={label} style={{ display: 'contents' }}>
              {i > 0 && (
                <div
                  className={`${styles.progressConnector} ${i <= currentStep ? styles.active : ''}`}
                />
              )}
              <div className={`${styles.progressStep} ${stepState ? styles[stepState] : ''}`}>
                <span className={styles.stepNumber}>{i < currentStep ? '\u2713' : i + 1}</span>
                <span>{label}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderStep1() {
    return (
      <div className={styles.stepCard}>
        <h2 className={styles.stepTitle}>Write Your Content</h2>

        <div className={styles.fieldGroup}>
          <label htmlFor="content-title" className={styles.label}>
            Title
          </label>
          <input
            id="content-title"
            type="text"
            className={styles.input}
            placeholder="Enter a title for your content"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="content-body" className={styles.label}>
            Body (Markdown supported)
          </label>
          <textarea
            id="content-body"
            className={styles.textarea}
            placeholder="Write your content here... Markdown formatting is supported."
            value={body}
            onChange={e => setBody(e.target.value)}
          />
          <span className={styles.charCount}>{body.length} characters</span>
        </div>

        <div className={styles.aiRow}>
          <button
            type="button"
            className={styles.aiButton}
            onClick={handleSummarize}
            disabled={!body.trim() || summarizing}
          >
            {summarizing ? 'Summarizing...' : 'AI Summarize'}
          </button>
        </div>

        {summary && (
          <div className={styles.summarySection}>
            <button
              type="button"
              className={styles.summaryToggle}
              onClick={() => setSummaryOpen(!summaryOpen)}
              aria-expanded={summaryOpen}
            >
              <span>AI Summary</span>
              <span>{summaryOpen ? '\u25B2' : '\u25BC'}</span>
            </button>
            {summaryOpen && <div className={styles.summaryContent}>{summary}</div>}
          </div>
        )}
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className={styles.stepCard}>
        <h2 className={styles.stepTitle}>Platform Adaptation</h2>
        <div className={styles.platformList}>
          {platformStates.map(platform => {
            const charLimit = PLATFORM_CHAR_LIMITS[platform.slug] ?? 5000;
            const adapted = truncateContent(body, charLimit);
            const charUsed = Math.min(body.length, charLimit);
            const color = getCharColor(body.length, charLimit);
            const fillPercent = Math.min((body.length / charLimit) * 100, 100);
            const isComingSoon = platform.comingSoon;
            const isDisconnected = !isComingSoon && !platform.connected;

            return (
              <div
                key={platform.slug}
                className={`${styles.platformCard} ${!platform.enabled ? styles.excluded : ''} ${
                  isComingSoon ? styles.comingSoonCard : ''
                }`}
              >
                <div className={styles.platformCardHeader}>
                  <div className={styles.platformTitle}>
                    <span className={styles.platformName}>{platform.name}</span>
                    {isComingSoon && <span className={styles.comingSoonBadge}>Coming Soon</span>}
                  </div>
                  <div className={styles.platformToggle}>
                    <span className={styles.toggleLabel}>
                      {isComingSoon
                        ? 'Unavailable'
                        : isDisconnected
                          ? 'Not connected'
                          : platform.enabled
                            ? 'Included'
                            : 'Excluded'}
                    </span>
                    <button
                      type="button"
                      className={`${styles.toggle} ${platform.enabled ? styles.toggleOn : ''}`}
                      onClick={() => togglePlatform(platform.slug)}
                      aria-label={
                        isComingSoon
                          ? `${platform.name} is coming soon`
                          : isDisconnected
                            ? `${platform.name} is not connected`
                            : `${platform.enabled ? 'Exclude' : 'Include'} ${platform.name}`
                      }
                      role="switch"
                      aria-checked={platform.enabled}
                      disabled={isComingSoon || isDisconnected}
                    >
                      <span className={styles.toggleKnob} />
                    </button>
                  </div>
                </div>

                {platform.enabled && (
                  <div className={styles.platformCardBody}>
                    <div className={styles.adaptedPreview}>{adapted}</div>

                    <div className={styles.fieldGroup} style={{ marginBottom: 0 }}>
                      <label htmlFor={`hashtags-${platform.slug}`} className={styles.label}>
                        Hashtags (comma-separated)
                      </label>
                      <input
                        id={`hashtags-${platform.slug}`}
                        type="text"
                        className={styles.hashtagInput}
                        placeholder="#hashtag1, #hashtag2"
                        value={platform.hashtags}
                        onChange={e => updateHashtags(platform.slug, e.target.value)}
                      />
                    </div>

                    <div className={styles.charBar}>
                      <div className={styles.charBarTrack}>
                        <div
                          className={`${styles.charBarFill} ${styles[color]}`}
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                      <span className={styles.charBarLabel}>
                        {charUsed} / {charLimit}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderStep3() {
    const platformNames = enabledPlatforms.map(p => p.name).join(', ');

    return (
      <div className={styles.stepCard}>
        <h2 className={styles.stepTitle}>Schedule or Publish</h2>

        <div className={styles.publishSummary}>
          Publishing to{' '}
          <strong>
            {enabledPlatforms.length} platform{enabledPlatforms.length !== 1 ? 's' : ''}
          </strong>
          {enabledPlatforms.length > 0 && <>: {platformNames}</>}
        </div>

        {publishError ? (
          <div className={styles.publishError} role="alert">
            {publishError}. No retry was attempted; review the configuration before submitting
            again.
          </div>
        ) : null}

        <div className={styles.scheduleOptions}>
          <div className={styles.scheduleRow}>
            <label>
              <input
                type="radio"
                name="scheduleMode"
                value="now"
                checked={scheduleMode === 'now'}
                onChange={() => setScheduleMode('now')}
              />{' '}
              Publish Now
            </label>

            <label>
              <input
                type="radio"
                name="scheduleMode"
                value="schedule"
                checked={scheduleMode === 'schedule'}
                onChange={() => setScheduleMode('schedule')}
              />{' '}
              Schedule for Later
            </label>
          </div>

          {scheduleMode === 'schedule' && (
            <div className={styles.fieldGroup}>
              <label htmlFor="schedule-time" className={styles.label}>
                Scheduled Date & Time
              </label>
              <input
                id="schedule-time"
                type="datetime-local"
                className={styles.dateTimeInput}
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Auth guard ──────────────────────────────────────────────────────────

  if (isLoading) return <LoadingSpinner size="lg" label="Loading..." />;
  if (!isAuthenticated) return null;

  // ── Main render ─────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Create Content</h1>

      {renderProgressBar()}

      {currentStep === 0 && renderStep1()}
      {currentStep === 1 && renderStep2()}
      {currentStep === 2 && renderStep3()}

      <div className={styles.navButtons}>
        <div className={styles.navButtonsLeft}>
          {currentStep > 0 && (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              Back
            </button>
          )}
          <button type="button" className={styles.btnSecondary} onClick={saveDraft}>
            Save Draft
          </button>
        </div>

        <div className={styles.navButtonsRight}>
          {currentStep < STEPS.length - 1 && (
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={
                (currentStep === 0 && !canProceedStep1) || (currentStep === 1 && !canProceedStep2)
              }
              onClick={() => setCurrentStep(currentStep + 1)}
            >
              Next
            </button>
          )}

          {currentStep === STEPS.length - 1 && (
            <button
              type="button"
              className={styles.btnSuccess}
              disabled={!canPublish || publishing}
              onClick={handlePublish}
            >
              {publishing ? 'Publishing...' : scheduleMode === 'now' ? 'Publish Now' : 'Schedule'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContentCreatePage;
