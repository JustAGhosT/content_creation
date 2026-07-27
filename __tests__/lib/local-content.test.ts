import {
  fetchAllSchedulerJobs,
  getContentStatusLabel,
  synchronizeContentStatuses,
  type StoredContent,
} from '@/lib/content/local-content';

const baseContent: StoredContent = {
  id: 'content-1',
  title: 'Post',
  body: 'Post body',
  summary: '',
  platforms: [],
  status: 'scheduled',
  scheduledTime: '2026-07-27T10:00:00.000Z',
  createdAt: '2026-07-27T09:00:00.000Z',
  updatedAt: '2026-07-27T09:00:00.000Z',
  schedulerJobIds: ['job-1', 'job-2'],
};

describe('synchronizeContentStatuses', () => {
  it('shows published only when every linked scheduler job is published', () => {
    expect(
      synchronizeContentStatuses(
        [baseContent],
        [
          { id: 'job-1', contentId: 'content-1', status: 'published' },
          { id: 'job-2', contentId: 'content-1', status: 'published' },
        ]
      )
    ).toEqual([expect.objectContaining({ status: 'published' })]);
  });

  it('shows publishing while a linked scheduler job is processing', () => {
    expect(
      synchronizeContentStatuses(
        [baseContent],
        [
          { id: 'job-1', contentId: 'content-1', status: 'published' },
          { id: 'job-2', contentId: 'content-1', status: 'processing' },
        ]
      )
    ).toEqual([expect.objectContaining({ status: 'processing' })]);
  });

  it('keeps an unlinked legacy content card unchanged', () => {
    const legacy = { ...baseContent, schedulerJobIds: undefined, status: 'queued' as const };
    expect(
      synchronizeContentStatuses(
        [legacy],
        [{ id: 'job-1', contentId: 'content-1', status: 'published' }]
      )
    ).toEqual([legacy]);
  });

  it('does not adopt a job whose content ID does not match the card', () => {
    expect(
      synchronizeContentStatuses(
        [baseContent],
        [
          { id: 'job-1', contentId: 'other-content', status: 'published' },
          { id: 'job-2', contentId: 'content-1', status: 'published' },
        ]
      )
    ).toEqual([baseContent]);
  });

  it('does not present a legacy scheduled status as live tracking', () => {
    expect(getContentStatusLabel('scheduled')).toBe('Tracking unavailable');
  });
});

describe('fetchAllSchedulerJobs', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('loads every scheduler page before deriving content status', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobs: [{ id: 'job-1', contentId: 'content-1', status: 'scheduled' }],
          total: 2,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobs: [{ id: 'job-2', contentId: 'content-1', status: 'published' }],
          total: 2,
        }),
      });

    await expect(fetchAllSchedulerJobs()).resolves.toHaveLength(2);
    expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/scheduler?limit=500&offset=0', {
      signal: undefined,
    });
    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/scheduler?limit=500&offset=1', {
      signal: undefined,
    });
  });
});
