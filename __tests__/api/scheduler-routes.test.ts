/**
 * Scheduler API Route Tests
 *
 * Tests for GET /api/scheduler (list jobs) and
 * POST /api/scheduler (create job).
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import type {
  CreateJobInput,
  ListJobsOptions,
  ListJobsResult,
  ScheduleJobResult,
  ScheduledJob,
} from '../../lib/scheduler/types';
import {
  type CampaignPublishAuditInput,
  SchedulerQueueError,
} from '../../lib/scheduler/prisma-queue';
import '../setup';

// Mock audit trail
jest.mock('../../app/api/_utils/audit', () => ({
  createLogEntry: jest.fn(() => ({})),
  logToAuditTrail: jest.fn(),
}));

// Mock scheduler module
const mockSchedule = jest.fn<(input: CreateJobInput) => Promise<ScheduleJobResult>>();
const mockFindIdempotentReplay =
  jest.fn<(input: CreateJobInput) => Promise<ScheduleJobResult | null>>();
const mockScheduleCampaign =
  jest.fn<
    (input: CreateJobInput, audit: CampaignPublishAuditInput) => Promise<ScheduleJobResult>
  >();
const mockListJobs = jest.fn<(options: ListJobsOptions) => Promise<ListJobsResult>>();
const mockAssertApprovedForQueue = jest.fn<
  () => Promise<{
    campaignRowId: string;
    versionId: string;
    contentHash: string;
    content: { text: string; mediaUrls?: string[]; hashtags?: string[]; mentions?: string[] };
  }>
>();
jest.mock('../../lib/campaigns/repository', () => ({
  assertApprovedForQueue: mockAssertApprovedForQueue,
}));

const mockGetPublishReadiness = jest.fn<
  (
    userId: string,
    platformSlug: string
  ) => Promise<
    | { canPublish: true; platform: 'twitter' }
    | {
        canPublish: false;
        platform: string;
        reason: 'coming_soon' | 'disconnected';
        message: string;
      }
  >
>();
jest.mock('../../lib/platforms/readiness', () => ({
  getPublishReadiness: mockGetPublishReadiness,
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

const sampleJob: ScheduledJob = {
  id: 'job-1',
  idempotencyKey: 'scheduler-route-key',
  requestFingerprint: 'scheduler-route-fingerprint',
  type: 'standalone',
  contentId: 'content-1',
  platformId: 'twitter',
  content: { text: 'Hello world' },
  scheduledTime: '2026-04-01T12:00:00Z',
  timezone: 'UTC',
  status: 'scheduled',
  attempts: 0,
  maxAttempts: 5,
  createdAt: '2026-04-01T11:00:00Z',
  updatedAt: '2026-04-01T11:00:00Z',
  createdBy: '1', // Matches the mock x-user-id from setup.ts
};

describe('Scheduler API Routes', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    mockListJobs.mockResolvedValue({ jobs: [sampleJob], total: 1 });
    mockSchedule.mockResolvedValue({ job: sampleJob, created: true });
    mockFindIdempotentReplay.mockResolvedValue(null);
    mockScheduleCampaign.mockResolvedValue({ job: sampleJob, created: true });
    mockGetPublishReadiness.mockResolvedValue({ canPublish: true, platform: 'twitter' });
    mockAssertApprovedForQueue.mockResolvedValue({
      campaignRowId: 'campaign-row-1',
      versionId: 'version-1',
      contentHash: `sha256:${'a'.repeat(64)}`,
      content: {
        text: 'Approved campaign post',
        hashtags: ['approved'],
      },
    });

    // Mock the scheduler before importing the route
    jest.doMock('../../lib/scheduler', () => ({
      getScheduler: () => ({
        scheduleWithResult: mockSchedule,
        findIdempotentReplay: mockFindIdempotentReplay,
        scheduleCampaignWithAudit: mockScheduleCampaign,
        cancel: jest.fn(),
        listJobs: mockListJobs,
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
      expect(mockListJobs).toHaveBeenCalledWith({
        userId: '1',
        status: undefined,
        campaignId: undefined,
        limit: 100,
        offset: 0,
      });
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

    test('rejects an idempotency key reused for a different request', async () => {
      mockSchedule.mockRejectedValueOnce(
        new SchedulerQueueError(
          'IDEMPOTENCY_CONFLICT',
          'Idempotency key belongs to another request'
        )
      );

      const response = await POST(
        createRequest('POST', {
          type: 'standalone',
          contentId: 'content-1',
          platformId: 'twitter',
          content: { text: 'Hello world from scheduler test' },
          scheduledTime: '2026-04-01T12:00:00Z',
          idempotencyKey: 'request-key-123',
        })
      );
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.message).toContain('Idempotency key');
    });

    test('does not misreport a corrupt durable row as an idempotency conflict', async () => {
      mockSchedule.mockRejectedValueOnce(
        new SchedulerQueueError('CORRUPT_JOB', 'Stored scheduler content is invalid')
      );

      const response = await POST(
        createRequest('POST', {
          type: 'standalone',
          contentId: 'content-1',
          platformId: 'twitter',
          content: { text: 'Hello world from scheduler test' },
          scheduledTime: '2026-04-01T12:00:00Z',
          idempotencyKey: 'request-key-123',
        })
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).not.toContain('Idempotency key');
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
        content: { text: 'Tampered request content', hashtags: ['tampered'] },
        scheduledTime: '2026-04-01T12:00:00Z',
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockAssertApprovedForQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignId: 'campaign-1',
          version: 2,
          contentHash,
          platformId: 'twitter',
        })
      );
      expect(mockScheduleCampaign).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignVersionId: 'version-1',
          approvedContentHash: contentHash,
          content: {
            text: 'Approved campaign post',
            hashtags: ['approved'],
          },
        }),
        expect.objectContaining({
          campaignId: 'campaign-row-1',
          campaignVersionId: 'version-1',
          variantId: 'variant-1',
        })
      );
    });

    test('replays an idempotent campaign request without duplicating its audit attempt', async () => {
      mockFindIdempotentReplay.mockResolvedValueOnce({ job: sampleJob, created: false });
      const contentHash = `sha256:${'a'.repeat(64)}`;
      const response = await POST(
        createRequest('POST', {
          type: 'campaign_post',
          campaignId: 'campaign-1',
          campaignVersion: 2,
          contentHash,
          variantId: 'variant-1',
          contentId: 'content-1',
          platformId: 'twitter',
          content: { text: 'Approved campaign post' },
          scheduledTime: '2026-04-01T12:00:00Z',
          idempotencyKey: 'campaign-request-123',
        })
      );

      expect(response.status).toBe(200);
      expect(mockFindIdempotentReplay).toHaveBeenCalledTimes(1);
      expect(mockAssertApprovedForQueue).not.toHaveBeenCalled();
      expect(mockScheduleCampaign).not.toHaveBeenCalled();
    });

    test('rejects a changed campaign replay before approval validation', async () => {
      mockFindIdempotentReplay.mockRejectedValueOnce(
        new SchedulerQueueError('IDEMPOTENCY_CONFLICT', 'Different request')
      );
      const response = await POST(
        createRequest('POST', {
          type: 'campaign_post',
          campaignId: 'campaign-1',
          campaignVersion: 2,
          contentHash: `sha256:${'a'.repeat(64)}`,
          variantId: 'variant-1',
          contentId: 'content-1',
          platformId: 'twitter',
          content: { text: 'Changed campaign request' },
          scheduledTime: '2026-04-01T12:00:00Z',
          idempotencyKey: 'campaign-request-123',
        })
      );

      expect(response.status).toBe(409);
      expect(mockAssertApprovedForQueue).not.toHaveBeenCalled();
      expect(mockScheduleCampaign).not.toHaveBeenCalled();
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
      mockGetPublishReadiness.mockResolvedValueOnce({
        canPublish: false,
        platform: 'facebook',
        reason: 'coming_soon',
        message: 'Facebook publishing is coming soon',
      });
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

    test('rejects a disconnected supported platform before scheduling', async () => {
      mockGetPublishReadiness.mockResolvedValueOnce({
        canPublish: false,
        platform: 'twitter',
        reason: 'disconnected',
        message: 'Connect X before publishing',
      });

      const response = await POST(
        createRequest('POST', {
          type: 'standalone',
          contentId: 'content-1',
          platformId: 'twitter',
          content: { text: 'Hello world' },
          scheduledTime: '2026-04-01T12:00:00Z',
        })
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('Connect X before publishing');
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
