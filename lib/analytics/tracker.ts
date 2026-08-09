/**
 * Analytics Tracker
 *
 * Client-side analytics tracking with batched event submission,
 * UTM parameter capture, and session management.
 *
 * Usage:
 *   import { tracker } from '@/lib/analytics/tracker';
 *   tracker.track('signup_completed', { method: 'email' });
 */

import type { AnalyticsEventName, BaseEventProperties, UTMProperties } from './events';
import { tokenStorage } from '@/lib/storage/token-storage';

const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 30_000; // 30 seconds
const SESSION_KEY = 'omnipost_session_id';
const UTM_KEY = 'omnipost_utm';
const MAX_ATTRIBUTION_VALUE_LENGTH = 128;
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
const ATTRIBUTION_EVENT_NAMES = new Set([
  'landing_view',
  'cta_clicked',
  'page_viewed',
  'signup_started',
  'signup_completed',
  'platform_connected',
]);

interface StoredAttribution extends UTMProperties {
  campaignToken?: string;
}

function normalizeAttribution(value: unknown): StoredAttribution {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const normalized: StoredAttribution = {};

  for (const key of UTM_KEYS) {
    const candidate = input[key];
    if (
      typeof candidate === 'string' &&
      candidate.length > 0 &&
      candidate.length <= MAX_ATTRIBUTION_VALUE_LENGTH
    ) {
      normalized[key] = candidate;
    }
  }

  const campaignToken = input.campaignToken;
  if (
    typeof campaignToken === 'string' &&
    campaignToken.length <= MAX_ATTRIBUTION_VALUE_LENGTH &&
    /^mtk_[a-z0-9_]+$/.test(campaignToken)
  ) {
    normalized.campaignToken = campaignToken;
  }

  return normalized;
}

// ── Session Management ───────────────────────────────────────────────────

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server';

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

// ── UTM Parameter Capture ────────────────────────────────────────────────

function captureAttributionParams(): StoredAttribution {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  const attribution: StoredAttribution = {};

  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value && value.length <= MAX_ATTRIBUTION_VALUE_LENGTH) {
      attribution[key] = value;
    }
  }

  const campaignToken = params.get('mtk') ?? params.get('campaign_token');
  if (
    campaignToken &&
    campaignToken.length <= MAX_ATTRIBUTION_VALUE_LENGTH &&
    /^mtk_[a-z0-9_]+$/.test(campaignToken)
  ) {
    attribution.campaignToken = campaignToken;
  }

  // Persist the opaque campaign token with UTMs for attribution across pages.
  if (Object.keys(attribution).length > 0) {
    try {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(attribution));
    } catch {
      // sessionStorage unavailable
    }
  }

  return attribution;
}

function getStoredAttribution(): StoredAttribution {
  if (typeof window === 'undefined') return {};

  try {
    const stored = sessionStorage.getItem(UTM_KEY);
    if (stored) {
      const attribution = normalizeAttribution(JSON.parse(stored) as unknown);
      if (Object.keys(attribution).length > 0) {
        sessionStorage.setItem(UTM_KEY, JSON.stringify(attribution));
      } else {
        sessionStorage.removeItem(UTM_KEY);
      }
      return attribution;
    }
  } catch {
    // parse error or storage unavailable
  }
  return {};
}

export function getStoredCampaignToken(): string | undefined {
  return getStoredAttribution().campaignToken;
}

// ── Event Queue & Batching ───────────────────────────────────────────────

interface QueuedEvent {
  eventId: string;
  name: string;
  properties: Record<string, unknown>;
}

function createEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `client:${crypto.randomUUID()}`;
  }
  return `client:${Date.now()}:${Math.random().toString(36).slice(2, 12)}`;
}

class AnalyticsTracker {
  private queue: QueuedEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const attribution = captureAttributionParams();
      if (attribution.campaignToken) {
        this.track('landing_view', {
          ...attribution,
          landingPage: window.location.pathname,
        });
      }

      // Set up periodic flush
      this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);

      // Flush on page unload
      window.addEventListener('beforeunload', () => this.flush());
      document.addEventListener('click', this.handleDocumentClick);
    }
  }

  private handleDocumentClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const cta = event.target.closest('a[href^="/signup"], [data-analytics-cta]');
    if (!cta) return;
    const attribution = getStoredAttribution();
    if (!attribution.campaignToken) return;
    this.track('cta_clicked', {
      ...attribution,
      landingPage: window.location.pathname,
    });
  };

  /**
   * Set the authenticated user ID for attribution
   */
  identify(_userId: string): void {
    // Identity is derived from the authenticated server request. Never trust a
    // client-supplied user identifier as the durable analytics owner.
  }

  /**
   * Track an analytics event
   */
  track(name: AnalyticsEventName | string, properties: Record<string, unknown> = {}): void {
    const baseProps: BaseEventProperties = {
      timestamp: new Date().toISOString(),
      sessionId: getOrCreateSessionId(),
    };

    const attribution = ATTRIBUTION_EVENT_NAMES.has(name) ? getStoredAttribution() : {};

    this.queue.push({
      eventId: createEventId(),
      name,
      properties: { ...baseProps, ...attribution, ...properties },
    });

    if (this.queue.length >= BATCH_SIZE) {
      this.flush();
    }
  }

  /**
   * Track a page view
   */
  pageView(properties: Record<string, unknown> = {}): void {
    if (typeof window === 'undefined') return;

    this.track('page_viewed', {
      url: window.location.pathname,
      referrer: document.referrer || undefined,
      title: document.title,
      ...captureAttributionParams(),
      ...properties,
    });
  }

  /**
   * Flush queued events to the server
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      const token = tokenStorage.getToken();
      const response = await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ events }),
        // Use keepalive for beforeunload reliability
        keepalive: true,
      });

      if (
        !response.ok &&
        (response.status === 408 || response.status === 429 || response.status >= 500)
      ) {
        // Re-queue transient failures only (up to a limit to prevent infinite growth).
        // Permanent 4xx responses identify an invalid batch and must not block later events.
        if (this.queue.length + events.length <= BATCH_SIZE * 5) {
          this.queue.push(...events);
        }
      }
    } catch {
      // Re-queue on network error
      if (this.queue.length + events.length <= BATCH_SIZE * 5) {
        this.queue.push(...events);
      }
    }
  }

  /**
   * Clean up (for testing or unmounting)
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', this.handleDocumentClick);
    }
    this.flush();
  }
}

// Singleton instance
export const tracker = new AnalyticsTracker();
