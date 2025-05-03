import { NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';
import pLimit from 'p-limit';
import { getPlatformConfig } from '../../../../config/platforms';
import { QueueItem, PublishResult } from '../../../../types';
import featureFlags from '../../../../utils/featureFlags';
import { withErrorHandling, Errors } from '../../_utils/errors';
import { isAuthenticated } from '../../_utils/auth';
import { createLogEntry, logToAuditTrail } from '../../_utils/audit';
import { validateArray } from '../../_utils/validation';

// Configure concurrency limit - could be moved to config
const MAX_CONCURRENT_REQUESTS = 5;

/**
 * Validates a queue item structure
 */
function validateQueueItem(item: QueueItem): { valid: boolean; error?: string } {
  if (!item.platform || !item.platform.name || !item.content) {
    return { valid: false, error: 'Invalid item structure' };
  }
  return { valid: true };
}

/**
 * Validates platform configuration
 */
function validatePlatformConfig(platformName: string): { valid: boolean; config?: any; error?: string } {
  const platformConfig = getPlatformConfig(platformName);
  
  if (!platformConfig) {
    return { valid: false, error: `Platform configuration not found for ${platformName}` };
  }

  // Check if API key is missing for a required platform
  if (platformConfig.required && !platformConfig.apiKey) {
    return { 
      valid: false, 
      error: `API key for ${platformName} is not configured. Please set the ${platformName.toUpperCase().replace(/\s+/g, '_')}_API_KEY environment variable.` 
    };
  }

  return { valid: true, config: platformConfig };
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
  
  // Validate platform configuration
  const configValidation = validatePlatformConfig(platformName);
  if (!configValidation.valid) {
    return { item, error: configValidation.error };
  }
  
  const platformConfig = configValidation.config;

  try {
    // Log individual publishing attempt
    const publishLogEntry = await createLogEntry(
      'PUBLISH_TO_PLATFORM', 
      { platformName, contentId }
    );
    await logToAuditTrail(publishLogEntry);
    
    // Publish to platform
    await axios.post(platformConfig.apiUrl, {
      content: item.content
    }, {
      headers: {
        ...platformConfig.headers,
        'Authorization': platformConfig.headers?.Authorization || `Bearer ${platformConfig.apiKey}`
      }
    });
    
    // Return successful result without error property
    return { item };
  } catch (err) {
    // Enhanced error handling with AxiosError details
    const axiosError = err as AxiosError;
    const statusCode = axiosError.response?.status;
    const errorMessage = !platformConfig.apiKey 
      ? `${axiosError.message} (This may be due to missing API key)`
      : axiosError.message;
    
    // Enhanced error logging with HTTP status
    const errorLogEntry = await createLogEntry(
      'PUBLISH_FAILURE', 
      { 
        platformName, 
        contentId, 
        error: errorMessage,
        statusCode: statusCode,
        responseData: axiosError.response?.data
      }
    );
    await logToAuditTrail(errorLogEntry);
    
    // Return failed result with error property
    return { 
      item, 
      error: errorMessage
    };
  }
}

export const POST = withErrorHandling(async (request: Request) => {
  // Check authentication
  if (!isAuthenticated()) {
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

  // Create a concurrency limiter
  const limit = pLimit(MAX_CONCURRENT_REQUESTS);
  
  // Process all items concurrently with throttling
  const publishPromises: Promise<PublishResult>[] = queue.map((item: QueueItem) => limit(() => publishItem(item)));
  const publishResults = await Promise.allSettled(publishPromises);
  
  // Process results
  const results: { success: QueueItem[]; failed: PublishResult[] } = { success: [], failed: [] };
  
  publishResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const publishResult = result.value;
      if (!publishResult.error) {
        // No error means success
        results.success.push(publishResult.item);
      } else {
        // Has error property means failure
        results.failed.push(publishResult);
      }
    } else {
      // Handle promise rejection (should be rare since publishItem handles its own errors)
      results.failed.push({ 
        item: queue[index], 
        error: `Unexpected error: ${result.reason?.message || 'Unknown error'}`
      });
    }
  });

  // Log the final results
  const completionLogEntry = await createLogEntry(
    'QUEUE_APPROVAL_COMPLETE', 
    { 
      successful: results.success.length, 
      failed: results.failed.length 
    }
  );
  await logToAuditTrail(completionLogEntry);

  // Return appropriate response based on results
  if (results.failed.length === 0) {
    return NextResponse.json({ 
      message: 'Queue approved and published successfully', 
      results 
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