import { NextResponse } from 'next/server';
import { getPublisher } from '../../../../lib/scheduler';
import type { ScheduledJob } from '../../../../lib/scheduler';
import { QueueItem, PublishResult } from '../../../../types';
import featureFlags from '../../../../lib/featureFlags';
import { withErrorHandling, Errors } from '../../_utils/errors';
import { isAuthenticated } from '../../_utils/auth';
import { createLogEntry, logToAuditTrail } from '../../_utils/audit';
import { validateArray } from '../../_utils/validation';

// Configure concurrency limit - could be moved to config
const MAX_CONCURRENT_REQUESTS = 5;

async function mapWithConcurrency<T, TResult>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<TResult>
): Promise<PromiseSettledResult<TResult>[]> {
  const results = new Array<PromiseSettledResult<TResult>>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      try {
        results[currentIndex] = {
          status: 'fulfilled',
          value: await mapper(items[currentIndex], currentIndex),
        };
      } catch (reason) {
        results[currentIndex] = {
          status: 'rejected',
          reason,
        };
      }
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}

/**
 * Validates a queue item structure
 */
function validateQueueItem(item: QueueItem): { valid: boolean; error?: string } {
  if (!item.platform || !item.platform.name || !item.content) {
    return { valid: false, error: 'Invalid item structure' };
  }
  if (!getContentText(item)) {
    return { valid: false, error: 'Content text is required' };
  }
  return { valid: true };
}

/**
 * Gets publishable text from legacy queue content.
 */
function getContentText(item: QueueItem): string {
  return (item.content.description || item.content.title || '').trim();
}

/**
 * Converts legacy queue items into scheduler publisher jobs.
 */
function toPublishJob(item: QueueItem): ScheduledJob {
  const now = new Date().toISOString();
  const platformId = item.platform.name.toLowerCase().replaceAll(/\s+/g, '-');
  const contentId = item.content.id || `queue-${platformId}-${Date.now()}`;

  return {
    id: `queue-${platformId}-${contentId}`,
    idempotencyKey: `queue-approve:${platformId}:${contentId}`,
    type: 'standalone',
    contentId,
    platformId,
    content: {
      text: getContentText(item),
      mediaUrls: item.content.mediaUrls,
      hashtags: item.content.hashtags,
      tiktokPrivacyLevel: item.content.tiktokPrivacyLevel,
    },
    scheduledTime: now,
    timezone: 'UTC',
    status: 'processing',
    attempts: 0,
    maxAttempts: 1,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Publishes a single item to its platform
 * Returns a PublishResult with error property if failed
 */
async function publishItem(item: QueueItem): Promise<PublishResult> {
  // Validate item structure
  const itemValidation = validateQueueItem(item);
  if (!itemValidation.valid) {
    return { item, error: itemValidation.error };
  }

  const platformName = item.platform.name.toLowerCase();
  const contentId = item.content.id || 'unknown';

  try {
    // Log individual publishing attempt
    const publishLogEntry = await createLogEntry('PUBLISH_TO_PLATFORM', {
      platformName,
      contentId,
    });
    await logToAuditTrail(publishLogEntry);

    const publishResult = await getPublisher().publish(toPublishJob(item));

    if (!publishResult.success) {
      return {
        item,
        error: publishResult.error?.message || 'Publishing failed',
      };
    }

    return {
      item,
      platformPostId: publishResult.result?.id,
      publishedUrl: publishResult.result?.url,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown publishing error';

    // Enhanced error logging with HTTP status
    const errorLogEntry = await createLogEntry('PUBLISH_FAILURE', {
      platformName,
      contentId,
      error: errorMessage,
    });
    await logToAuditTrail(errorLogEntry);

    // Return failed result with error property
    return {
      item,
      error: errorMessage,
    };
  }
}

export const POST = withErrorHandling(async (request: Request) => {
  // Check authentication
  if (!(await isAuthenticated())) {
    return Errors.unauthorized('Authentication required to approve queue');
  }

  // Check if platform connectors feature is enabled
  if (!featureFlags.platformConnectors) {
    return Errors.forbidden('Platform connectors feature is disabled');
  }

  // Parse the request body
  const body = await request.json();
  const { queue } = body;

  // Validate queue is an array
  const queueError = validateArray(queue, 'Queue');
  if (queueError) {
    return Errors.badRequest(queueError);
  }

  // Check if queue is empty
  if (queue.length === 0) {
    return Errors.badRequest('Queue must be a non-empty array');
  }

  // Log the queue approval request
  const approvalLogEntry = await createLogEntry('APPROVE_QUEUE', { queueSize: queue.length });
  await logToAuditTrail(approvalLogEntry);

  // Process all items concurrently with throttling
  const publishResults = await mapWithConcurrency(queue, MAX_CONCURRENT_REQUESTS, publishItem);

  // Process results
  const results: { success: PublishResult[]; failed: PublishResult[] } = {
    success: [],
    failed: [],
  };

  publishResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const publishResult = result.value;
      if (!publishResult.error) {
        // No error means success
        results.success.push(publishResult);
      } else {
        // Has error property means failure
        results.failed.push(publishResult);
      }
    } else {
      // Handle promise rejection (should be rare since publishItem handles its own errors)
      results.failed.push({
        item: queue[index],
        error: `Unexpected error: ${result.reason?.message || 'Unknown error'}`,
      });
    }
  });

  // Log the final results
  const completionLogEntry = await createLogEntry('QUEUE_APPROVAL_COMPLETE', {
    successful: results.success.length,
    failed: results.failed.length,
  });
  await logToAuditTrail(completionLogEntry);

  // Return appropriate response based on results
  if (results.failed.length === 0) {
    return NextResponse.json({
      message: 'Queue approved and published successfully',
      results,
    });
  } else if (results.success.length === 0) {
    return NextResponse.json(
      { message: 'All publishing attempts failed', results },
      { status: 500 }
    );
  } else {
    return NextResponse.json(
      { message: 'Some items published successfully', results },
      { status: 207 }
    );
  }
});
