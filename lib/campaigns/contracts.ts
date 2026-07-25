import { createHash } from 'node:crypto';
import { z } from 'zod';
import { sanitizeText } from '@/app/api/_utils/sanitize';
import type { Campaign, CampaignContent } from '@/types/campaign';

const safeText = (maxLength: number) =>
  z
    .string()
    .min(1)
    .max(maxLength)
    .transform(value => sanitizeText(value));

const optionalSafeText = (maxLength: number) =>
  z
    .string()
    .max(maxLength)
    .optional()
    .transform(value => (value ? sanitizeText(value) : value));

const platformEngagementSchema = z
  .object({
    impressions: z.number().nonnegative(),
    engagements: z.number().nonnegative(),
    clicks: z.number().nonnegative(),
    shares: z.number().nonnegative(),
    comments: z.number().nonnegative(),
    likes: z.number().nonnegative().optional(),
    retweets: z.number().nonnegative().optional(),
  })
  .strict();

const platformAdaptationSchema = z
  .object({
    variantId: z.string().min(1).max(128),
    platformId: z.string().min(1).max(64),
    platformName: safeText(100),
    content: safeText(100_000),
    mediaUrls: z.array(z.string().url()).max(20).optional(),
    hashtags: z.array(z.string().max(100)).max(100).optional(),
    mentions: z.array(z.string().max(100)).max(100).optional(),
    scheduledTime: z.string().datetime().optional(),
    status: z.enum(['pending', 'scheduled', 'queued', 'published', 'failed']),
    publishedAt: z.string().datetime().optional(),
    publishedUrl: z.string().url().optional(),
    engagementMetrics: platformEngagementSchema.optional(),
    error: optionalSafeText(1000),
  })
  .strict();

const campaignContentSchema = z
  .object({
    id: z.string().min(1).max(128),
    type: z.enum(['series-article', 'standalone', 'thread', 'announcement']),
    sourceId: z.string().max(128).optional(),
    sourceType: z.enum(['series', 'external']).optional(),
    title: safeText(500),
    body: safeText(100_000),
    summary: optionalSafeText(10_000),
    adaptations: z.array(platformAdaptationSchema).max(100),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

const campaignPlatformSchema = z
  .object({
    platformId: z.string().min(1).max(64),
    platformName: safeText(100),
    enabled: z.boolean(),
    config: z
      .object({
        postFrequency: z.enum(['hourly', 'daily', 'weekly', 'custom']),
        bestTimes: z.array(z.string().max(20)).max(100).optional(),
        hashtagStrategy: z.array(z.string().max(100)).max(100).optional(),
        threadEnabled: z.boolean().optional(),
        maxPostLength: z.number().int().positive().optional(),
        defaultHashtags: z.array(z.string().max(100)).max(100).optional(),
      })
      .strict(),
  })
  .strict();

const scheduledPostSchema = z
  .object({
    id: z.string().min(1).max(128),
    contentId: z.string().min(1).max(128),
    platformId: z.string().min(1).max(64),
    adaptationIndex: z.number().int().nonnegative(),
    scheduledTime: z.string().datetime(),
    status: z.enum(['pending', 'scheduled', 'queued', 'published', 'failed']),
    publishedAt: z.string().datetime().optional(),
    error: optionalSafeText(1000),
  })
  .strict();

export const campaignSnapshotSchema: z.ZodType<Campaign> = z
  .object({
    id: z.string().min(1).max(128),
    name: safeText(500),
    description: z
      .string()
      .max(10_000)
      .transform(value => sanitizeText(value)),
    status: z.enum(['draft', 'scheduled', 'active', 'paused', 'completed']),
    seriesIds: z.array(z.string().max(128)).max(100),
    contentItems: z.array(campaignContentSchema).max(1000),
    platforms: z.array(campaignPlatformSchema).max(100),
    schedule: z
      .object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime().optional(),
        timezone: z.string().min(1).max(100),
        posts: z.array(scheduledPostSchema).max(10_000),
      })
      .strict(),
    metrics: z
      .object({
        totalPosts: z.number().int().nonnegative(),
        publishedPosts: z.number().int().nonnegative(),
        scheduledPosts: z.number().int().nonnegative(),
        failedPosts: z.number().int().nonnegative(),
        totalEngagement: z.number().nonnegative(),
        platformMetrics: z.record(platformEngagementSchema),
      })
      .strict(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    tags: z.array(z.string().max(100)).max(100),
  })
  .strict();

export const createCampaignVersionSchema = z
  .object({
    campaign: campaignSnapshotSchema,
    expectedVersion: z.number().int().positive().optional(),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    source: z.enum(['user', 'git-import', 'browser-import']).default('user'),
  })
  .strict();

export const approvalSchema = z
  .object({
    version: z.number().int().positive(),
    contentId: z.string().min(1).max(128),
    variantId: z.string().min(1).max(128).optional(),
    state: z.enum(['approved', 'rejected']),
    contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    notes: optionalSafeText(1000),
  })
  .strict();

const hashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const evidenceSchema = z
  .record(z.unknown())
  .refine(value => JSON.stringify(value).length <= 50_000, 'Evidence is too large');

export const campaignEventSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('ai-generation'),
      version: z.number().int().positive(),
      contentId: z.string().min(1).max(128),
      variantId: z.string().min(1).max(128),
      evidence: evidenceSchema,
      inputHash: hashSchema,
      outputHash: hashSchema,
      decision: z.enum(['accepted', 'edited', 'rejected']),
    })
    .strict(),
  z
    .object({
      type: z.literal('decision'),
      version: z.number().int().positive(),
      decision: z.enum(['continue', 'revise', 'pause', 'stop']),
      rationale: safeText(10_000),
      evidence: evidenceSchema.optional(),
    })
    .strict(),
]);

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function sha256(value: unknown): string {
  return `sha256:${createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

export function campaignContentHash(content: CampaignContent): string {
  return sha256({
    id: content.id,
    type: content.type,
    title: content.title,
    body: content.body,
    summary: content.summary,
    adaptations: content.adaptations.map(adaptation => ({
      variantId: adaptation.variantId,
      platformId: adaptation.platformId,
      content: adaptation.content,
      mediaUrls: adaptation.mediaUrls,
      hashtags: adaptation.hashtags,
      mentions: adaptation.mentions,
    })),
  });
}

export function campaignContentHashes(campaign: Campaign): Record<string, string> {
  return Object.fromEntries(
    campaign.contentItems.map(content => [content.id, campaignContentHash(content)])
  );
}
