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

const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 30_000; // 30 seconds
const SESSION_KEY = 'omnipost_session_id';
const UTM_KEY = 'omnipost_utm';

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

function captureUTMParams(): UTMProperties {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  const utm: UTMProperties = {};

  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
  for (const key of utmKeys) {
    const value = params.get(key);
    if (value) {
      utm[key] = value;
    }
  }

  // Persist UTMs for attribution across pages
  if (Object.keys(utm).length > 0) {
    try {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
    } catch {
      // sessionStorage unavailable
    }
  }

  return utm;
}

function getStoredUTMs(): UTMProperties {
  if (typeof window === 'undefined') return {};

  try {
    const stored = sessionStorage.getItem(UTM_KEY);
    if (stored) {
      return JSON.parse(stored) as UTMProperties;
    }
  } catch {
    // parse error or storage unavailable
  }
  return {};
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
      // Capture UTMs on first load
      captureUTMParams();

      // Set up periodic flush
      this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);

      // Flush on page unload
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

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

    const utms = getStoredUTMs();

    this.queue.push({
      eventId: createEventId(),
      name,
      properties: { ...baseProps, ...utms, ...properties },
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
      ...captureUTMParams(),
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
      const response = await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        // Use keepalive for beforeunload reliability
        keepalive: true,
      });

      if (!response.ok) {
        // Re-queue on failure (up to a limit to prevent infinite growth)
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
    this.flush();
  }
}

// Singleton instance
export const tracker = new AnalyticsTracker();
