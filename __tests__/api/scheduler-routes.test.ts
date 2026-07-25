/**
 * Scheduler API Route Tests
 *
 * Tests for GET /api/scheduler (list jobs) and
 * POST /api/scheduler (create job).
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import '../setup';

// Mock audit trail
jest.mock('../../app/api/_utils/audit', () => ({
  createLogEntry: jest.fn(() => ({})),
  logToAuditTrail: jest.fn(),
}));

// Mock scheduler module
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSchedule = jest.fn<any>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetAllJobs = jest.fn<any>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetJobsByStatus = jest.fn<any>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetJobsByCampaign = jest.fn<any>();
const mockAssertApprovedForQueue =
  jest.fn<() => Promise<{ versionId: string; contentHash: string }>>();
const mockRecordPublishAttempt = jest.fn<() => Promise<{ id: string }>>();

jest.mock('../../lib/campaigns/repository', () => ({
  assertApprovedForQueue: mockAssertApprovedForQueue,
  recordPublishAttempt: mockRecordPublishAttempt,
}));

// Mock the sanitize module
jest.mock('../../app/api/_utils/sanitize', () => ({
  sanitizeText: jest.fn((val: string) => val),
  validateAndSanitize: jest.fn((schema: { safeParse: Function }, data: unknown) => {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return {
      success: false,
      errors: result.error.issues.map((i: { message: string }) => i.message),
    };
  }),
}));

// We dynamically import the route to ensure mocks are in place
let GET: (req: Request) => Promise<Response>;
let POST: (req: Request) => Promise<Response>;

function createRequest(
  method: string,
  body?: Record<string, unknown>,
  url: string = 'http://localhost:3000/api/scheduler'
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

const sampleJob = {
  id: 'job-1',
  type: 'standalone',
  contentId: 'content-1',
  platformId: 'twitter',
  content: { text: 'Hello world' },
  scheduledTime: '2026-04-01T12:00:00Z',
  timezone: 'UTC',
  status: 'pending',
  createdBy: '1', // Matches the mock x-user-id from setup.ts
};

describe('Scheduler API Routes', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    mockGetAllJobs.mockResolvedValue([sampleJob]);
    mockGetJobsByStatus.mockResolvedValue([sampleJob]);
    mockGetJobsByCampaign.mockResolvedValue([sampleJob]);
    mockSchedule.mockResolvedValue(sampleJob);
    mockAssertApprovedForQueue.mockResolvedValue({
      versionId: 'version-1',
      contentHash: `sha256:${'a'.repeat(64)}`,
    });
    mockRecordPublishAttempt.mockResolvedValue({ id: 'attempt-1' });

    // Mock the scheduler before importing the route
    jest.doMock('../../lib/scheduler', () => ({
      getScheduler: () => ({
        schedule: mockSchedule,
        getAllJobs: mockGetAllJobs,
        getJobsByStatus: mockGetJobsByStatus,
        getJobsByCampaign: mockGetJobsByCampaign,
      }),
    }));

    const mod = await import('../../app/api/scheduler/route');
    GET = mod.GET;
    POST = mod.POST;
  });

  describe('GET /api/scheduler', () => {
    test('requires authentication', async () => {
      // Override headers mock to simulate unauthenticated request
      const { headers } = require('next/headers');
      (headers as jest.Mock).mockReturnValueOnce({
        get: (_name: string) => null, // No x-user-id
      });

      const request = createRequest('GET');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toContain('Authentication required');
    });

    test('returns paginated jobs', async () => {
      const request = createRequest('GET', undefined, 'http://localhost:3000/api/scheduler');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toBeDefined();
      expect(Array.isArray(data.jobs)).toBe(true);
      expect(data.count).toBeDefined();
      expect(data.total).toBeDefined();
    });
  });

  describe('POST /api/scheduler', () => {
    test('creates job with valid input', async () => {
      const validJob = {
        type: 'standalone',
        contentId: 'content-1',
        platformId: 'twitter',
        content: { text: 'Hello world from scheduler test' },
        scheduledTime: '2026-04-01T12:00:00Z',
      };

      const request = createRequest('POST', validJob);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.job).toBeDefined();
      expect(mockSchedule).toHaveBeenCalledTimes(1);
      expect(mockSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'standalone',
          contentId: 'content-1',
          platformId: 'twitter',
          createdBy: '1',
        })
      );
    });

    test('rejects invalid input', async () => {
      // Missing required fields
      const invalidJob = {
        type: 'standalone',
        // missing contentId, platformId, content, scheduledTime
      };

      const request = createRequest('POST', invalidJob);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('Invalid input');
      expect(mockSchedule).not.toHaveBeenCalled();
    });

    test('binds a campaign post to its approved immutable version', async () => {
      const contentHash = `sha256:${'a'.repeat(64)}`;
      const request = createRequest('POST', {
        type: 'campaign_post',
        campaignId: 'campaign-1',
        campaignVersion: 2,
        contentHash,
        variantId: 'variant-1',
        contentId: 'content-1',
        platformId: 'twitter',
        content: { text: 'Approved campaign post' },
        scheduledTime: '2026-04-01T12:00:00Z',
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockAssertApprovedForQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignId: 'campaign-1',
          version: 2,
          contentHash,
        })
      );
      expect(mockRecordPublishAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ campaignId: 'campaign-1', variantId: 'variant-1' })
      );
      expect(mockSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignVersionId: 'version-1',
          approvedContentHash: contentHash,
        })
      );
    });

    test('rejects a campaign post without immutable approval fields', async () => {
      const request = createRequest('POST', {
        type: 'campaign_post',
        campaignId: 'campaign-1',
        contentId: 'content-1',
        platformId: 'twitter',
        content: { text: 'Unbound campaign post' },
        scheduledTime: '2026-04-01T12:00:00Z',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(mockAssertApprovedForQueue).not.toHaveBeenCalled();
      expect(mockSchedule).not.toHaveBeenCalled();
    });

    test('rejects coming-soon platforms before scheduling', async () => {
      const comingSoonJob = {
        type: 'standalone',
        contentId: 'content-1',
        platformId: 'facebook',
        content: { text: 'Hello world' },
        scheduledTime: '2026-04-01T12:00:00Z',
      };

      const request = createRequest('POST', comingSoonJob);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('Facebook publishing is coming soon');
      expect(mockSchedule).not.toHaveBeenCalled();
    });

    test('requires authentication for POST', async () => {
      const { headers } = require('next/headers');
      (headers as jest.Mock).mockReturnValueOnce({
        get: (_name: string) => null, // No x-user-id
      });

      const validJob = {
        type: 'standalone',
        contentId: 'content-1',
        platformId: 'twitter',
        content: { text: 'Hello world' },
        scheduledTime: '2026-04-01T12:00:00Z',
      };

      const request = createRequest('POST', validJob);
      const response = await POST(request);
      await response.json();

      expect(response.status).toBe(401);
      expect(mockSchedule).not.toHaveBeenCalled();
    });
  });
});
