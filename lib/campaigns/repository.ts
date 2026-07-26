import type { CampaignVersion, Prisma, PrismaClient } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import type { ScheduledJob } from '@/lib/scheduler/types';
import type { Campaign } from '@/types/campaign';
import {
  campaignContentHash,
  campaignContentHashes,
  campaignSnapshotSchema,
  sha256,
  stableStringify,
} from './contracts';

export type CampaignPersistenceErrorCode =
  | 'CAMPAIGN_NOT_FOUND'
  | 'CAMPAIGN_STALE_VERSION'
  | 'CAMPAIGN_FORBIDDEN'
  | 'CAMPAIGN_APPROVAL_REQUIRED'
  | 'CAMPAIGN_CONTENT_HASH_MISMATCH'
  | 'CAMPAIGN_PERSISTENCE_UNAVAILABLE';

export class CampaignPersistenceError extends Error {
  constructor(
    readonly code: CampaignPersistenceErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'CampaignPersistenceError';
  }
}

export type PersistedCampaign = {
  campaign: Campaign;
  version: number;
  versionId: string;
  snapshotHash: string;
  contentHashes: Record<string, string>;
};

function getClient(): PrismaClient {
  if (!prisma) {
    throw new CampaignPersistenceError(
      'CAMPAIGN_PERSISTENCE_UNAVAILABLE',
      'Campaign persistence is not configured'
    );
  }
  return prisma;
}

function parseVersion(version: CampaignVersion): PersistedCampaign {
  const campaign = campaignSnapshotSchema.parse(JSON.parse(version.snapshot));
  return {
    campaign,
    version: version.version,
    versionId: version.id,
    snapshotHash: version.snapshotHash,
    contentHashes: campaignContentHashes(campaign),
  };
}

async function ownedCampaign(
  client: PrismaClient | Prisma.TransactionClient,
  externalId: string,
  userId: string
) {
  const campaign = await client.campaign.findFirst({ where: { externalId, userId } });
  if (!campaign) {
    throw new CampaignPersistenceError('CAMPAIGN_NOT_FOUND', 'Campaign not found');
  }
  return campaign;
}

export async function listCampaigns(userId: string): Promise<PersistedCampaign[]> {
  const campaigns = await getClient().campaign.findMany({
    where: { userId },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    orderBy: { updatedAt: 'desc' },
  });

  return campaigns.flatMap(campaign =>
    campaign.versions[0] ? [parseVersion(campaign.versions[0])] : []
  );
}

export async function getCampaign(userId: string, campaignId: string): Promise<PersistedCampaign> {
  const campaign = await getClient().campaign.findFirst({
    where: { externalId: campaignId, userId },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
  });
  if (!campaign?.versions[0]) {
    throw new CampaignPersistenceError('CAMPAIGN_NOT_FOUND', 'Campaign not found');
  }
  return parseVersion(campaign.versions[0]);
}

export async function saveCampaignVersion(input: {
  userId: string;
  campaign: Campaign;
  expectedVersion?: number;
  slug?: string;
  source: 'user' | 'git-import' | 'browser-import';
}): Promise<PersistedCampaign> {
  const client = getClient();
  const sanitizedCampaign = campaignSnapshotSchema.parse(input.campaign);
  const snapshot = stableStringify(sanitizedCampaign);
  const snapshotHash = sha256(sanitizedCampaign);

  const version = await client.$transaction(async transaction => {
    const existing = await transaction.campaign.findFirst({
      where: { externalId: sanitizedCampaign.id, userId: input.userId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });

    const latest = existing?.versions[0];
    if (latest?.snapshotHash === snapshotHash) {
      return latest;
    }

    if (existing && input.expectedVersion !== existing.currentVersion) {
      throw new CampaignPersistenceError(
        'CAMPAIGN_STALE_VERSION',
        `Expected campaign version ${existing.currentVersion}`
      );
    }

    const nextVersion = existing ? existing.currentVersion + 1 : 1;
    let campaignRowId: string;
    if (!existing) {
      const created = await transaction.campaign.create({
        data: {
          externalId: sanitizedCampaign.id,
          slug: input.slug,
          name: sanitizedCampaign.name,
          description: sanitizedCampaign.description,
          status: sanitizedCampaign.status,
          currentVersion: nextVersion,
          source: input.source,
          startDate: new Date(sanitizedCampaign.schedule.startDate),
          endDate: sanitizedCampaign.schedule.endDate
            ? new Date(sanitizedCampaign.schedule.endDate)
            : undefined,
          userId: input.userId,
        },
      });
      campaignRowId = created.id;
    } else {
      await transaction.campaign.update({
        where: { id: existing.id },
        data: {
          name: sanitizedCampaign.name,
          description: sanitizedCampaign.description,
          status: sanitizedCampaign.status,
          currentVersion: nextVersion,
          startDate: new Date(sanitizedCampaign.schedule.startDate),
          endDate: sanitizedCampaign.schedule.endDate
            ? new Date(sanitizedCampaign.schedule.endDate)
            : null,
        },
      });
      campaignRowId = existing.id;
    }

    return transaction.campaignVersion.create({
      data: {
        campaignId: campaignRowId,
        version: nextVersion,
        snapshot,
        snapshotHash,
        createdBy: input.userId,
      },
    });
  });

  return parseVersion(version);
}

export async function deleteCampaign(userId: string, campaignId: string): Promise<void> {
  const client = getClient();
  const campaign = await ownedCampaign(client, campaignId, userId);
  await client.campaign.delete({ where: { id: campaign.id } });
}

export async function recordApproval(input: {
  userId: string;
  campaignId: string;
  version: number;
  contentId: string;
  variantId?: string;
  state: 'approved' | 'rejected';
  contentHash: string;
  notes?: string;
}) {
  const client = getClient();
  return client.$transaction(async transaction => {
    const campaign = await ownedCampaign(transaction, input.campaignId, input.userId);
    if (campaign.currentVersion !== input.version) {
      throw new CampaignPersistenceError(
        'CAMPAIGN_STALE_VERSION',
        `Expected campaign version ${campaign.currentVersion}`
      );
    }

    const version = await transaction.campaignVersion.findUnique({
      where: {
        campaignId_version: { campaignId: campaign.id, version: input.version },
      },
    });
    if (!version) {
      throw new CampaignPersistenceError('CAMPAIGN_NOT_FOUND', 'Campaign version not found');
    }

    const snapshot = campaignSnapshotSchema.parse(JSON.parse(version.snapshot));
    const content = snapshot.contentItems.find(item => item.id === input.contentId);
    if (!content) {
      throw new CampaignPersistenceError('CAMPAIGN_NOT_FOUND', 'Campaign content not found');
    }
    if (
      input.variantId &&
      !content.adaptations.some(adaptation => adaptation.variantId === input.variantId)
    ) {
      throw new CampaignPersistenceError('CAMPAIGN_NOT_FOUND', 'Campaign adaptation not found');
    }
    const expectedHash = campaignContentHash(content);
    if (expectedHash !== input.contentHash) {
      throw new CampaignPersistenceError(
        'CAMPAIGN_CONTENT_HASH_MISMATCH',
        'Approval content hash does not match the current campaign version'
      );
    }

    return transaction.campaignApproval.create({
      data: {
        campaignVersionId: version.id,
        contentId: input.contentId,
        variantId: input.variantId,
        state: input.state,
        reviewerId: input.userId,
        contentHash: input.contentHash,
        notes: input.notes,
      },
    });
  });
}

export async function recordAttributionLinks(input: {
  userId: string;
  campaignId: string;
  version: number;
  links: Array<{
    contentId: string;
    variantId: string;
    platformId: string;
    trackingToken: string;
    utmId: string;
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
    utmContent: string;
  }>;
}): Promise<void> {
  const client = getClient();
  await client.$transaction(async transaction => {
    const campaign = await ownedCampaign(transaction, input.campaignId, input.userId);
    const version = await transaction.campaignVersion.findUnique({
      where: {
        campaignId_version: { campaignId: campaign.id, version: input.version },
      },
    });
    if (!version) {
      throw new CampaignPersistenceError('CAMPAIGN_NOT_FOUND', 'Campaign version not found');
    }
    const snapshot = campaignSnapshotSchema.parse(JSON.parse(version.snapshot));

    for (const link of input.links) {
      const content = snapshot.contentItems.find(item => item.id === link.contentId);
      const adaptation = content?.adaptations.find(
        item => item.variantId === link.variantId && item.platformId === link.platformId
      );
      if (!adaptation) {
        throw new CampaignPersistenceError(
          'CAMPAIGN_NOT_FOUND',
          'Attribution adaptation not found in campaign version'
        );
      }
      const existing = await transaction.attributionLink.findFirst({
        where: { campaignId: campaign.id, trackingToken: link.trackingToken },
      });
      if (existing) {
        const sameIdentity =
          existing.campaignId === campaign.id &&
          existing.contentId === link.contentId &&
          existing.variantId === link.variantId &&
          existing.platformId === link.platformId;
        if (!sameIdentity) {
          throw new CampaignPersistenceError(
            'CAMPAIGN_CONTENT_HASH_MISMATCH',
            `Tracking token ${link.trackingToken} already identifies another adaptation`
          );
        }
        continue;
      }

      await transaction.attributionLink.create({
        data: {
          campaignId: campaign.id,
          campaignVersionId: version.id,
          ...link,
        },
      });
    }
  });
}

export async function assertApprovedForQueue(input: {
  userId: string;
  campaignId: string;
  version: number;
  contentId: string;
  variantId?: string;
  platformId: string;
  contentHash: string;
}): Promise<{
  versionId: string;
  contentHash: string;
  content: ScheduledJob['content'];
}> {
  const client = getClient();
  const campaign = await ownedCampaign(client, input.campaignId, input.userId);
  if (campaign.currentVersion !== input.version) {
    throw new CampaignPersistenceError(
      'CAMPAIGN_STALE_VERSION',
      `Expected campaign version ${campaign.currentVersion}`
    );
  }

  const version = await client.campaignVersion.findUnique({
    where: {
      campaignId_version: { campaignId: campaign.id, version: input.version },
    },
  });
  if (!version) {
    throw new CampaignPersistenceError('CAMPAIGN_NOT_FOUND', 'Campaign version not found');
  }

  const snapshot = campaignSnapshotSchema.parse(JSON.parse(version.snapshot));
  const content = snapshot.contentItems.find(item => item.id === input.contentId);
  const adaptation = content?.adaptations.find(
    item => item.variantId === input.variantId && item.platformId === input.platformId
  );
  if (!content || !adaptation || campaignContentHash(content) !== input.contentHash) {
    throw new CampaignPersistenceError(
      'CAMPAIGN_CONTENT_HASH_MISMATCH',
      'Queued content does not match the approved campaign adaptation'
    );
  }

  const approval = await client.campaignApproval.findFirst({
    where: {
      campaignVersionId: version.id,
      contentId: input.contentId,
      variantId: input.variantId ?? null,
      contentHash: input.contentHash,
    },
    orderBy: [{ reviewedAt: 'desc' }, { id: 'desc' }],
  });
  if (approval?.state !== 'approved') {
    throw new CampaignPersistenceError(
      'CAMPAIGN_APPROVAL_REQUIRED',
      'The latest review must approve this exact campaign version and content hash'
    );
  }

  return {
    versionId: version.id,
    contentHash: approval.contentHash,
    content: {
      text: adaptation.content,
      mediaUrls: adaptation.mediaUrls,
      hashtags: adaptation.hashtags,
      mentions: adaptation.mentions,
    },
  };
}

export async function recordAiGeneration(input: {
  userId: string;
  campaignId: string;
  version: number;
  contentId: string;
  variantId: string;
  evidence: Record<string, unknown>;
  inputHash: string;
  outputHash: string;
  decision: 'accepted' | 'edited' | 'rejected';
}) {
  const client = getClient();
  const campaign = await ownedCampaign(client, input.campaignId, input.userId);
  const version = await client.campaignVersion.findUnique({
    where: { campaignId_version: { campaignId: campaign.id, version: input.version } },
  });
  if (!version) {
    throw new CampaignPersistenceError('CAMPAIGN_NOT_FOUND', 'Campaign version not found');
  }
  const snapshot = campaignSnapshotSchema.parse(JSON.parse(version.snapshot));
  const adaptation = snapshot.contentItems
    .find(item => item.id === input.contentId)
    ?.adaptations.find(item => item.variantId === input.variantId);
  if (!adaptation) {
    throw new CampaignPersistenceError(
      'CAMPAIGN_NOT_FOUND',
      'AI generation adaptation not found in campaign version'
    );
  }
  return client.aiGenerationRecord.create({
    data: {
      campaignVersionId: version.id,
      contentId: input.contentId,
      variantId: input.variantId,
      evidence: stableStringify(input.evidence),
      inputHash: input.inputHash,
      outputHash: input.outputHash,
      reviewerId: input.userId,
      decision: input.decision,
      createdAt: new Date(),
    },
  });
}

export async function recordPublishAttempt(input: {
  userId: string;
  campaignId: string;
  version: number;
  contentId: string;
  variantId: string;
  platformId: string;
  contentHash: string;
}) {
  const client = getClient();
  const campaign = await ownedCampaign(client, input.campaignId, input.userId);
  const version = await client.campaignVersion.findUnique({
    where: { campaignId_version: { campaignId: campaign.id, version: input.version } },
  });
  if (!version) {
    throw new CampaignPersistenceError('CAMPAIGN_NOT_FOUND', 'Campaign version not found');
  }
  const snapshot = campaignSnapshotSchema.parse(JSON.parse(version.snapshot));
  const content = snapshot.contentItems.find(item => item.id === input.contentId);
  const adaptation = content?.adaptations.find(
    item => item.variantId === input.variantId && item.platformId === input.platformId
  );
  if (!content || !adaptation || campaignContentHash(content) !== input.contentHash) {
    throw new CampaignPersistenceError(
      'CAMPAIGN_CONTENT_HASH_MISMATCH',
      'Publish attempt content hash does not match its campaign version'
    );
  }
  return client.publishAttempt.create({
    data: {
      campaignId: campaign.id,
      campaignVersionId: version.id,
      contentId: input.contentId,
      variantId: input.variantId,
      platformId: input.platformId,
      contentHash: input.contentHash,
      requestedBy: input.userId,
    },
  });
}

export async function recordCampaignDecision(input: {
  userId: string;
  campaignId: string;
  version: number;
  decision: 'continue' | 'revise' | 'pause' | 'stop';
  rationale: string;
  evidence?: Record<string, unknown>;
}) {
  const client = getClient();
  const campaign = await ownedCampaign(client, input.campaignId, input.userId);
  const version = await client.campaignVersion.findUnique({
    where: { campaignId_version: { campaignId: campaign.id, version: input.version } },
  });
  if (!version) {
    throw new CampaignPersistenceError('CAMPAIGN_NOT_FOUND', 'Campaign version not found');
  }
  return client.campaignDecision.create({
    data: {
      campaignId: campaign.id,
      campaignVersionId: version.id,
      decision: input.decision,
      rationale: input.rationale,
      evidence: input.evidence ? stableStringify(input.evidence) : undefined,
      decidedBy: input.userId,
    },
  });
}

export async function campaignAudit(userId: string, campaignId: string) {
  const client = getClient();
  const campaign = await ownedCampaign(client, campaignId, userId);
  return client.campaign.findUnique({
    where: { id: campaign.id },
    include: {
      versions: {
        orderBy: { version: 'asc' },
        include: {
          approvals: { orderBy: { reviewedAt: 'asc' } },
          attributionLinks: true,
          aiGenerationRecords: true,
          publishAttempts: { orderBy: { requestedAt: 'asc' } },
          decisions: { orderBy: { decidedAt: 'asc' } },
          scheduledPosts: { orderBy: { scheduledAt: 'asc' } },
        },
      },
    },
  });
}
