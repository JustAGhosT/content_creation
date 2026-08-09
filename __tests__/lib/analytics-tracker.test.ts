/**
 * Analytics Tracker Tests
 *
 * Tests for the client-side analytics tracker including
 * event queuing, batching, flushing, and page view tracking.
 *
 * @jest-environment jsdom
 */

import { beforeEach, afterEach, describe, expect, jest, test } from '@jest/globals';

// Mock fetch globally
const mockFetch = jest.fn<() => Promise<Response>>();
global.fetch = mockFetch as unknown as typeof fetch;

describe('Analytics Tracker', () => {
  let tracker: {
    track: (name: string, properties?: Record<string, unknown>) => void;
    flush: () => Promise<void>;
    pageView: (properties?: Record<string, unknown>) => void;
    identify: (userId: string) => void;
    destroy: () => void;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, received: 1 }),
    } as Response);

    // Clear sessionStorage
    sessionStorage.clear();
    localStorage.clear();

    // Set up window.location for tests
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/dashboard',
        search: '',
        href: 'http://localhost:3000/dashboard',
      },
      writable: true,
      configurable: true,
    });

    // Re-import to get a fresh singleton instance
    jest.resetModules();
    const mod = require('../../lib/analytics/tracker');
    tracker = mod.tracker;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('track() queues events with correct properties', () => {
    tracker.track('signup_completed', { method: 'email' });

    // Event is queued but not yet sent (queue size < BATCH_SIZE of 10)
    expect(mockFetch).not.toHaveBeenCalled();

    // Flush to verify the event structure
    tracker.flush();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0] as unknown[];
    const body = JSON.parse((callArgs[1] as RequestInit).body as string);

    expect(body.events).toHaveLength(1);
    expect(body.events[0].name).toBe('signup_completed');
    expect(body.events[0].properties.method).toBe('email');
  });

  test('track() includes sessionId and timestamp', () => {
    tracker.track('page_viewed', {});
    tracker.flush();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0] as unknown[];
    const body = JSON.parse((callArgs[1] as RequestInit).body as string);

    const props = body.events[0].properties;
    expect(props.sessionId).toBeDefined();
    expect(typeof props.sessionId).toBe('string');
    expect(props.timestamp).toBeDefined();
    expect(typeof props.timestamp).toBe('string');
    // Timestamp should be a valid ISO string
    expect(new Date(props.timestamp).toISOString()).toBe(props.timestamp);
  });

  test('flush() sends batched events to API', async () => {
    tracker.track('event_1', { key: 'a' });
    tracker.track('event_2', { key: 'b' });
    tracker.track('event_3', { key: 'c' });

    await tracker.flush();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0] as unknown[];

    expect(callArgs[0]).toBe('/api/analytics/events');

    const init = callArgs[1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);

    const body = JSON.parse(init.body as string);
    expect(body.events).toHaveLength(3);
    expect(body.events[0].name).toBe('event_1');
    expect(body.events[1].name).toBe('event_2');
    expect(body.events[2].name).toBe('event_3');
  });

  test('flush() authenticates conversion events after registration', async () => {
    localStorage.setItem('auth-token', 'verified-registration-token');
    tracker.track('signup_completed', { method: 'email' });

    await tracker.flush();

    const callArgs = mockFetch.mock.calls[0] as unknown[];
    const init = callArgs[1] as RequestInit;
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer verified-registration-token',
    });
  });

  test('flush() re-queues events on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    tracker.track('important_event', { data: 'test' });

    await tracker.flush();

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // The event should be re-queued. Flushing again should re-send it.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    await tracker.flush();

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const callArgs = mockFetch.mock.calls[1] as unknown[];
    const body = JSON.parse((callArgs[1] as RequestInit).body as string);
    expect(body.events).toHaveLength(1);
    expect(body.events[0].name).toBe('important_event');
  });

  test('pageView() captures URL and referrer', () => {
    // Set document.referrer via Object.defineProperty since it's read-only in jsdom
    Object.defineProperty(document, 'referrer', {
      value: 'https://google.com',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, 'title', {
      value: 'OmniPost Dashboard',
      writable: true,
      configurable: true,
    });

    tracker.pageView();
    tracker.flush();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0] as unknown[];
    const body = JSON.parse((callArgs[1] as RequestInit).body as string);

    const event = body.events[0];
    expect(event.name).toBe('page_viewed');
    expect(event.properties.url).toBe('/dashboard');
    expect(event.properties.referrer).toBe('https://google.com');
    expect(event.properties.title).toBe('OmniPost Dashboard');
  });

  test('captures a public campaign token and emits landing and CTA events', async () => {
    tracker.destroy();
    jest.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/',
        search: '?mtk=mtk_campaign_public_1&utm_source=x&utm_medium=organic_social',
        href: 'http://localhost:3000/?mtk=mtk_campaign_public_1',
      },
      writable: true,
      configurable: true,
    });

    jest.resetModules();
    const campaignTracker = require('../../lib/analytics/tracker').tracker as typeof tracker;
    await campaignTracker.flush();

    const landingCall = mockFetch.mock.calls[0] as unknown[];
    const landingBatch = JSON.parse((landingCall[1] as RequestInit).body as string);
    expect(landingBatch.events[0]).toMatchObject({
      name: 'landing_view',
      properties: {
        campaignToken: 'mtk_campaign_public_1',
        utm_source: 'x',
        landingPage: '/',
      },
    });

    const signupLink = document.createElement('a');
    signupLink.href = '/signup';
    document.body.appendChild(signupLink);
    signupLink.click();
    await campaignTracker.flush();

    const ctaCall = mockFetch.mock.calls[1] as unknown[];
    const ctaBatch = JSON.parse((ctaCall[1] as RequestInit).body as string);
    expect(ctaBatch.events[0]).toMatchObject({
      name: 'cta_clicked',
      properties: {
        campaignToken: 'mtk_campaign_public_1',
        landingPage: '/',
      },
    });
    campaignTracker.destroy();
    signupLink.remove();
  });
});
