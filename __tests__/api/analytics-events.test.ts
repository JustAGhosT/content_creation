/**
 * Analytics Events API Tests
 *
 * Tests for POST /api/analytics/events (batch event ingestion)
 * and GET /api/analytics/events (funnel metrics retrieval).
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import '../setup';

interface MockStoredEvent {
  name: string;
  occurredAt: Date;
  userId: string;
  campaignId?: string;
}

const mockStoredEvents: MockStoredEvent[] = [];
let mockSequence = 0;

jest.mock('../../lib/analytics/repository', () => ({
  AnalyticsPersistenceError: class AnalyticsPersistenceError extends Error {},
  recordAnalyticsEvents: jest.fn(
    async (events: Array<{ name: string; properties: Record<string, unknown> }>) => {
      for (const event of events) {
        mockStoredEvents.push({
          name: event.name,
          occurredAt: new Date((event.properties.timestamp as string | undefined) ?? Date.now()),
          userId: '1',
          campaignId: event.properties.campaignId as string | undefined,
        });
      }
    }
  ),
}));

jest.mock('../../lib/db/prisma', () => ({
  __esModule: true,
  default: {
    analyticsEventRecord: {
      findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
        mockStoredEvents
          .filter(event => event.userId === where.userId)
          .filter(event => !where.name || event.name === where.name)
          .filter(event => !where.campaignId || event.campaignId === where.campaignId)
          .filter(event => {
            const occurredAt = where.occurredAt as { gte?: Date } | undefined;
            return !occurredAt?.gte || event.occurredAt >= occurredAt.gte;
          })
          .map(event => ({ name: event.name }))
      ),
    },
  },
}));

// Mock audit trail
jest.mock('../../app/api/_utils/audit', () => ({
  createLogEntry: jest.fn(() => ({})),
  logToAuditTrail: jest.fn(),
}));

// We need to reset module state between tests because the eventStore is module-level
let POST: (req: Request) => Promise<Response>;
let GET: (req: Request) => Promise<Response>;

function createRequest(
  method: string,
  body?: Record<string, unknown>,
  url: string = 'http://localhost:3000/api/analytics/events'
): Request {
  return {
    method,
    url,
    headers: {
      get: (name: string) => {
        if (name === 'content-type') return 'application/json';
        if (name === 'x-forwarded-for') return '127.0.0.1';
        return null;
      },
    },
    json: async () => body || {},
  } as unknown as Request;
}

function event(name: string, properties: Record<string, unknown> = {}) {
  mockSequence += 1;
  return { eventId: `test:event:${mockSequence}`, name, properties };
}

describe('Analytics Events API', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockStoredEvents.splice(0);
    mockSequence = 0;
    // Re-import to reset in-memory eventStore
    jest.resetModules();
    const mod = await import('../../app/api/analytics/events/route');
    POST = mod.POST;
    GET = mod.GET;
  });

  describe('POST /api/analytics/events', () => {
    test('should accept a valid event batch (200)', async () => {
      const request = createRequest('POST', {
        events: [
          event('page_viewed', { url: '/home' }),
          event('signup_started', { method: 'email' }),
        ],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.received).toBe(2);
    });

    test('should reject an empty events array (400)', async () => {
      const request = createRequest('POST', {
        events: [],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('Invalid event batch');
    });

    test('should reject an oversized batch with more than 50 events (400)', async () => {
      const events = Array.from({ length: 51 }, (_, i) => ({
        eventId: `test:event:${i}`,
        name: `event_${i}`,
        properties: {},
      }));

      const request = createRequest('POST', { events });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('Invalid event batch');
    });

    test('should reject an event with an empty name (400)', async () => {
      const request = createRequest('POST', {
        events: [event('', {})],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('Invalid event batch');
    });

    test('rejects properties outside the privacy allow-list', async () => {
      const response = await POST(
        createRequest('POST', {
          events: [event('landing_view', { access_token: 'must-not-be-stored' })],
        })
      );

      expect(response.status).toBe(400);
    });

    test('rejects a property that belongs to a different event contract', async () => {
      const response = await POST(
        createRequest('POST', {
          events: [event('signup_completed', { campaignId: 'client-authored-campaign' })],
        })
      );

      expect(response.status).toBe(400);
    });

    test('accepts the existing post-created status property', async () => {
      const response = await POST(
        createRequest('POST', {
          events: [
            event('post_created', {
              platformCount: 1,
              platformNames: ['X'],
              status: 'queued',
            }),
          ],
        })
      );

      expect(response.status).toBe(200);
    });

    test('rejects client-authored campaign lifecycle evidence', async () => {
      const response = await POST(
        createRequest('POST', {
          events: [event('publish_succeeded', { campaignId: 'campaign-1' })],
        })
      );

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/analytics/events', () => {
    test('should require authentication (401 without user headers)', async () => {
      // Override headers mock to simulate unauthenticated request
      const { headers } = require('next/headers');
      (headers as jest.Mock).mockReturnValueOnce({
        get: (_name: string) => {
          // No x-user-id header means unauthenticated
          return null;
        },
      });

      const request = createRequest('GET', undefined, 'http://localhost:3000/api/analytics/events');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toContain('Authentication required');
    });

    test('should return funnel metrics with auth headers', async () => {
      // First, ingest some events
      const postRequest = createRequest('POST', {
        events: [
          event('page_viewed'),
          event('signup_started'),
          event('signup_completed'),
          event('platform_connected'),
        ],
      });
      await POST(postRequest);

      // Then, query the events (uses default mock which includes x-user-id)
      const getRequest = createRequest(
        'GET',
        undefined,
        'http://localhost:3000/api/analytics/events'
      );

      const response = await GET(getRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalEvents).toBe(4);
      expect(data.funnel).toBeDefined();
      expect(data.funnel.acquisition.pageViews).toBe(1);
      expect(data.funnel.acquisition.signupStarted).toBe(1);
      expect(data.funnel.acquisition.signupCompleted).toBe(1);
      expect(data.funnel.activation.platformConnected).toBe(1);
    });

    test('should filter by event name', async () => {
      // Ingest events
      const postRequest = createRequest('POST', {
        events: [event('page_viewed'), event('page_viewed'), event('signup_started')],
      });
      await POST(postRequest);

      // Query filtered by event name
      const getRequest = createRequest(
        'GET',
        undefined,
        'http://localhost:3000/api/analytics/events?event=page_viewed'
      );

      const response = await GET(getRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalEvents).toBe(2);
      expect(data.counts['page_viewed']).toBe(2);
      expect(data.counts['signup_started']).toBeUndefined();
    });

    test('should filter by since date', async () => {
      // Ingest events
      const postRequest = createRequest('POST', {
        events: [event('page_viewed')],
      });
      await POST(postRequest);

      // Use a date far in the past so all events are included
      const pastDate = '2020-01-01T00:00:00Z';
      const getRequest = createRequest(
        'GET',
        undefined,
        `http://localhost:3000/api/analytics/events?since=${pastDate}`
      );

      const response = await GET(getRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalEvents).toBe(1);

      // Use a date far in the future so no events match
      const futureDate = '2099-01-01T00:00:00Z';
      const getRequest2 = createRequest(
        'GET',
        undefined,
        `http://localhost:3000/api/analytics/events?since=${futureDate}`
      );

      const response2 = await GET(getRequest2);
      const data2 = await response2.json();

      expect(response2.status).toBe(200);
      expect(data2.totalEvents).toBe(0);
    });
  });
});
