import { NextResponse } from 'next/server';
import axios from 'axios';
import { getPlatformConfig } from '../../../../config/platforms';
import { QueueItem, PublishResult } from '../../../../types';
import featureFlags from '../../../../utils/featureFlags';
import { withErrorHandling, Errors } from '../../_utils/errors';
import { isAuthenticated } from '../../_utils/auth';
import { createLogEntry, logToAuditTrail } from '../../_utils/audit';
import { validateArray } from '../../_utils/validation';

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
  await logToAuditTrail(createLogEntry('APPROVE_QUEUE', { queueSize: queue.length }));

  const results: { success: QueueItem[]; failed: PublishResult[] } = { success: [], failed: [] };

  for (const item of queue) {
    if (!item.platform || !item.platform.name || !item.content) {
      results.failed.push({ item, error: 'Invalid item structure' });
      continue;
    }

    const platformName = item.platform.name.toLowerCase();
    const platformConfig = getPlatformConfig(platformName);
    
    if (!platformConfig) {
      results.failed.push({ item, error: `Platform configuration not found for ${platformName}` });
      continue;
    }

    // Check if API key is missing for a required platform
    if (platformConfig.required && !platformConfig.apiKey) {
      results.failed.push({ 
        item, 
        error: `API key for ${platformName} is not configured. Please set the ${platformName.toUpperCase().replace(/\s+/g, '_')}_API_KEY environment variable.` 
      });
      continue;
    }

    try {
      // Log individual publishing attempt
      await logToAuditTrail(createLogEntry(
        'PUBLISH_TO_PLATFORM', 
        { platformName, contentId: item.content.id || 'unknown' }
      ));
      
      await axios.post(platformConfig.apiUrl, {
        content: item.content
      }, {
        headers: {
          ...platformConfig.headers,
          'Authorization': platformConfig.headers?.Authorization || `Bearer ${platformConfig.apiKey}`
        }
      });
      results.success.push(item);
    } catch (err) {
      const error = err as Error;
      // Add more context to the error if it might be API key related
      const errorMessage = !platformConfig.apiKey 
        ? `${error.message} (This may be due to missing API key)`
        : error.message;
      
      // Log publishing failure
      await logToAuditTrail(createLogEntry(
        'PUBLISH_FAILURE', 
        { platformName, contentId: item.content.id || 'unknown', error: errorMessage }
      ));
      
      results.failed.push({ item, error: errorMessage });
    }
  }

  // Log the final results
  await logToAuditTrail(createLogEntry(
    'QUEUE_APPROVAL_COMPLETE', 
    { 
      successful: results.success.length, 
      failed: results.failed.length 
    }
  ));

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