import { NextResponse } from 'next/server';
import { platforms } from '../../../config/platforms';
import { withErrorHandling } from '../_utils/errors';
import { withAuditLogging, createLogEntry, logToAuditTrail } from '../_utils/audit';
import { isAuthenticated } from '../_utils/auth';
import featureFlags from '../../../utils/featureFlags';

export const GET = withErrorHandling(async () => {
  // Check authentication
  if (!isAuthenticated()) {
    return new NextResponse(
      JSON.stringify({ message: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Log the access to platforms list
  await logToAuditTrail(createLogEntry('GET_PLATFORMS_LIST'));
  
  // Return platforms list
  return NextResponse.json(platforms);
});

export const POST = withErrorHandling(async (request: Request) => {
  // Check feature flags
  if (!featureFlags.trigger.cron.enabled) {
    return Errors.forbidden('CRON trigger feature is disabled');
  }

  if (!featureFlags.trigger.rss.enabled) {
    return Errors.forbidden('RSS trigger feature is disabled');
  }

  if (!featureFlags.scraping.enabled) {
    return Errors.forbidden('Scraping feature is disabled');
  }

  if (!featureFlags.storage.notion.enabled) {
    return Errors.forbidden('Notion storage feature is disabled');
  }

  if (!featureFlags.writing.openai.enabled) {
    return Errors.forbidden('OpenAI writing feature is disabled');
  }

  if (!featureFlags.distribution.telegram.enabled) {
    return Errors.forbidden('Telegram distribution feature is disabled');
  }

  // Handle the POST request logic here
  // For now, just return a success response
  return NextResponse.json({ message: 'POST request handled successfully' });
});
