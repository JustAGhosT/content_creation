export type ContentStatus =
  | 'pending'
  | 'scheduled'
  | 'queued'
  | 'processing'
  | 'published'
  | 'failed';

export interface SchedulerJobSnapshot {
  id: string;
  contentId: string;
  status:
    | 'pending'
    | 'scheduled'
    | 'processing'
    | 'published'
    | 'failed'
    | 'dead'
    | 'reconciliation_required'
    | 'cancelled';
}

export interface StoredPlatform {
  slug: string;
  name: string;
  enabled: boolean;
  hashtags: string;
}

export interface StoredContent {
  id: string;
  title: string;
  body: string;
  summary: string;
  platforms: StoredPlatform[];
  status: ContentStatus;
  scheduledTime: string;
  createdAt: string;
  updatedAt: string;
  schedulerJobIds?: string[];
}

export const CONTENT_STORAGE_KEY = 'omnipost_content_drafts';

export function loadStoredContent(): StoredContent[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = sessionStorage.getItem(CONTENT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredContent[]) : [];
  } catch {
    return [];
  }
}

export function getContentStatusLabel(status: ContentStatus, schedulerJobIds?: string[]): string {
  if (
    !schedulerJobIds?.length &&
    (status === 'scheduled' || status === 'queued' || status === 'processing')
  ) {
    return 'Tracking unavailable';
  }

  switch (status) {
    case 'queued':
      return 'Queued';
    case 'processing':
      return 'Publishing';
    case 'scheduled':
      return 'Scheduled';
    case 'published':
      return 'Published';
    case 'failed':
      return 'Needs attention';
    default:
      return 'Draft';
  }
}

export function synchronizeContentStatuses(
  items: StoredContent[],
  schedulerJobs: SchedulerJobSnapshot[]
): StoredContent[] {
  const jobsById = new Map(schedulerJobs.map(job => [job.id, job]));

  return items.map(item => {
    const matchingJobs = item.schedulerJobIds
      ?.map(jobId => jobsById.get(jobId))
      .filter((job): job is SchedulerJobSnapshot => Boolean(job && job.contentId === item.id));

    if (!matchingJobs?.length || matchingJobs.length !== item.schedulerJobIds?.length) return item;

    const statuses = matchingJobs.map(job => job.status);
    let status: ContentStatus;

    if (
      statuses.some(value =>
        ['failed', 'dead', 'reconciliation_required', 'cancelled'].includes(value)
      )
    ) {
      status = 'failed';
    } else if (statuses.every(value => value === 'published')) {
      status = 'published';
    } else if (statuses.some(value => value === 'processing')) {
      status = 'processing';
    } else if (statuses.some(value => value === 'scheduled' || value === 'pending')) {
      status = 'scheduled';
    } else {
      status = item.status;
    }

    return status === item.status ? item : { ...item, status };
  });
}

export function formatContentDate(iso: string, includeTime = false): string {
  if (!iso) return 'Not scheduled';

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}
