/**
 * useAnalytics Hook
 *
 * Provides analytics tracking functions for React components.
 * Automatically tracks page views and provides typed event methods.
 *
 * Usage:
 *   const { track, trackPageView } = useAnalytics();
 *   track('signup_completed', { method: 'email' });
 */

'use client';

import { useEffect, useCallback } from 'react';
import { tracker, AnalyticsEvents } from '@/lib/analytics';
import type { AnalyticsEventName } from '@/lib/analytics';

interface UseAnalyticsOptions {
  /** Auto-track page view on mount (default: true) */
  trackPageView?: boolean;
  /** User ID for identification */
  userId?: string;
}

interface AnalyticsAPI {
  /** Track a generic event */
  track: (name: AnalyticsEventName | string, properties?: Record<string, unknown>) => void;
  /** Track a page view explicitly */
  trackPageView: (properties?: Record<string, unknown>) => void;
  /** Track signup completion */
  trackSignup: (method: 'email' | 'google' | 'github' | 'mystira') => void;
  /** Track the first meaningful interaction with signup */
  trackSignupStarted: (method: 'email' | 'google' | 'github' | 'mystira') => void;
  /** Track onboarding step */
  trackOnboardingStep: (stepNumber: number, stepName: string, skipped?: boolean) => void;
  /** Track platform connection */
  trackPlatformConnected: (platformName: string, totalPlatforms: number) => void;
  /** Track post published */
  trackPostPublished: (platforms: string[], isFirstPost?: boolean) => void;
  /** Track feature usage */
  trackFeatureUsed: (featureName: string, context?: string) => void;
  /** Identify the user */
  identify: (userId: string) => void;
  /** Event name constants */
  events: typeof AnalyticsEvents;
}

export function useAnalytics(options: UseAnalyticsOptions = {}): AnalyticsAPI {
  const { trackPageView: autoTrackPageView = true, userId } = options;

  // Identify user if provided
  useEffect(() => {
    if (userId) {
      tracker.identify(userId);
    }
  }, [userId]);

  // Auto-track page view on mount
  useEffect(() => {
    if (autoTrackPageView) {
      tracker.pageView();
    }
  }, [autoTrackPageView]);

  const track = useCallback(
    (name: AnalyticsEventName | string, properties: Record<string, unknown> = {}) => {
      tracker.track(name, properties);
    },
    []
  );

  const trackPageViewFn = useCallback((properties: Record<string, unknown> = {}) => {
    tracker.pageView(properties);
  }, []);

  const trackSignup = useCallback((method: 'email' | 'google' | 'github' | 'mystira') => {
    tracker.track(AnalyticsEvents.SIGNUP_COMPLETED, { method });
  }, []);

  const trackSignupStarted = useCallback((method: 'email' | 'google' | 'github' | 'mystira') => {
    tracker.track(AnalyticsEvents.SIGNUP_STARTED, { method });
  }, []);

  const trackOnboardingStep = useCallback(
    (stepNumber: number, stepName: string, skipped = false) => {
      tracker.track(AnalyticsEvents.ONBOARDING_STEP_COMPLETED, {
        stepNumber,
        stepName,
        skipped,
      });
    },
    []
  );

  const trackPlatformConnected = useCallback((platformName: string, totalPlatforms: number) => {
    tracker.track(AnalyticsEvents.PLATFORM_CONNECTED, {
      platformName,
      totalPlatforms,
    });
  }, []);

  const trackPostPublished = useCallback((platforms: string[], isFirstPost = false) => {
    tracker.track(AnalyticsEvents.POST_PUBLISHED, {
      platformNames: platforms,
      platformCount: platforms.length,
      isFirstPost,
    });
  }, []);

  const trackFeatureUsed = useCallback((featureName: string, context?: string) => {
    tracker.track(AnalyticsEvents.FEATURE_USED, { featureName, context });
  }, []);

  const identify = useCallback((id: string) => {
    tracker.identify(id);
  }, []);

  return {
    track,
    trackPageView: trackPageViewFn,
    trackSignup,
    trackSignupStarted,
    trackOnboardingStep,
    trackPlatformConnected,
    trackPostPublished,
    trackFeatureUsed,
    identify,
    events: AnalyticsEvents,
  };
}
