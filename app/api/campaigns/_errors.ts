import { createErrorResponse } from '@/app/api/_utils/errors';
import { CampaignPersistenceError } from '@/lib/campaigns/repository';

export function campaignErrorResponse(error: unknown): Response | undefined {
  if (!(error instanceof CampaignPersistenceError)) {
    return undefined;
  }

  const statusByCode = {
    CAMPAIGN_NOT_FOUND: 404,
    CAMPAIGN_STALE_VERSION: 409,
    CAMPAIGN_FORBIDDEN: 403,
    CAMPAIGN_APPROVAL_REQUIRED: 409,
    CAMPAIGN_CONTENT_HASH_MISMATCH: 409,
    CAMPAIGN_PERSISTENCE_UNAVAILABLE: 503,
  } as const;

  return createErrorResponse(error.message, statusByCode[error.code], undefined, error.code);
}
