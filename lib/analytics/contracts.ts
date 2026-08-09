import { z } from 'zod';
import { AnalyticsEvents } from './events';
import type { AnalyticsEventName } from './events';

const boundedText = (max: number) => z.string().min(1).max(max);
const optionalBoundedText = (max: number) => boundedText(max).optional();

export const analyticsEventNameSchema = z.enum(
  Object.values(AnalyticsEvents) as [
    (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents],
    ...(typeof AnalyticsEvents)[keyof typeof AnalyticsEvents][],
  ]
);

export const analyticsPropertiesSchema = z
  .object({
    timestamp: z.string().datetime().optional(),
    sessionId: optionalBoundedText(128),
    campaignId: optionalBoundedText(128),
    campaignVersion: z.number().int().positive().optional(),
    contentId: optionalBoundedText(128),
    variantId: optionalBoundedText(128),
    platform: optionalBoundedText(64),
    publishAttemptId: optionalBoundedText(128),
    providerPostId: optionalBoundedText(256),
    campaignToken: z
      .string()
      .regex(/^mtk_[a-z0-9_]+$/)
      .optional(),
    utmSource: optionalBoundedText(128),
    utmMedium: optionalBoundedText(128),
    utmCampaign: optionalBoundedText(128),
    utmContent: optionalBoundedText(128),
    landingPage: optionalBoundedText(2048),
    utm_source: optionalBoundedText(128),
    utm_medium: optionalBoundedText(128),
    utm_campaign: optionalBoundedText(128),
    utm_content: optionalBoundedText(128),
    utm_term: optionalBoundedText(128),
    url: optionalBoundedText(2048),
    referrer: optionalBoundedText(2048),
    title: optionalBoundedText(500),
    method: z.enum(['email', 'google', 'github']).optional(),
    referralSource: optionalBoundedText(128),
    stepNumber: z.number().int().nonnegative().optional(),
    stepName: optionalBoundedText(128),
    skipped: z.boolean().optional(),
    platformName: optionalBoundedText(64),
    totalPlatforms: z.number().int().nonnegative().optional(),
    contentType: optionalBoundedText(64),
    platformCount: z.number().int().nonnegative().optional(),
    platformNames: z.array(boundedText(64)).max(20).optional(),
    isFirstPost: z.boolean().optional(),
    source: optionalBoundedText(128),
    planName: optionalBoundedText(64),
    billingPeriod: z.enum(['monthly', 'annual']).optional(),
    amount: z.number().nonnegative().optional(),
    fromPlan: optionalBoundedText(64),
    toPlan: optionalBoundedText(64),
    featureName: optionalBoundedText(128),
    context: optionalBoundedText(256),
    channel: z.enum(['email', 'twitter', 'linkedin', 'copy']).optional(),
    referrerId: optionalBoundedText(128),
    ownerRole: optionalBoundedText(64),
    approvalState: z.enum(['approved', 'rejected']).optional(),
    reviewerRole: optionalBoundedText(64),
    failureCode: optionalBoundedText(128),
    retryable: z.boolean().optional(),
    latencyMs: z.number().int().nonnegative().optional(),
    attemptNumber: z.number().int().positive().optional(),
    status: z.enum(['draft', 'pending', 'queued', 'scheduled', 'published', 'failed']).optional(),
  })
  .strict();

export type AnalyticsProperties = z.infer<typeof analyticsPropertiesSchema>;

const commonPropertyNames = ['timestamp', 'sessionId'] as const;
const utmPropertyNames = [
  'campaignToken',
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'utmContent',
  'landingPage',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

function allowedProperties(
  ...names: Array<keyof AnalyticsProperties>
): ReadonlySet<keyof AnalyticsProperties> {
  return new Set([...commonPropertyNames, ...names]);
}

const eventPropertyAllowList: Record<AnalyticsEventName, ReadonlySet<keyof AnalyticsProperties>> = {
  campaign_created: allowedProperties('campaignId', 'campaignVersion', 'ownerRole'),
  content_approved: allowedProperties(
    'campaignId',
    'campaignVersion',
    'contentId',
    'variantId',
    'approvalState',
    'reviewerRole'
  ),
  publish_job_queued: allowedProperties(
    'campaignId',
    'campaignVersion',
    'contentId',
    'variantId',
    'platform',
    'publishAttemptId',
    'campaignToken'
  ),
  publish_attempted: allowedProperties(
    'campaignId',
    'campaignVersion',
    'contentId',
    'variantId',
    'platform',
    'publishAttemptId',
    'attemptNumber'
  ),
  publish_succeeded: allowedProperties(
    'campaignId',
    'campaignVersion',
    'contentId',
    'variantId',
    'platform',
    'publishAttemptId',
    'providerPostId',
    'latencyMs'
  ),
  publish_failed: allowedProperties(
    'campaignId',
    'campaignVersion',
    'contentId',
    'variantId',
    'platform',
    'publishAttemptId',
    'failureCode',
    'retryable',
    'latencyMs'
  ),
  landing_view: allowedProperties(...utmPropertyNames, 'url'),
  cta_clicked: allowedProperties(...utmPropertyNames, 'url'),
  page_viewed: allowedProperties('url', 'referrer', 'title', ...utmPropertyNames),
  signup_started: allowedProperties('method', 'referralSource', ...utmPropertyNames),
  signup_completed: allowedProperties('method', 'referralSource', ...utmPropertyNames),
  onboarding_step_completed: allowedProperties('stepNumber', 'stepName', 'skipped'),
  platform_connected: allowedProperties(
    'platform',
    'platformName',
    'totalPlatforms',
    ...utmPropertyNames
  ),
  platform_disconnected: allowedProperties('platform', 'platformName', 'totalPlatforms'),
  post_created: allowedProperties(
    'contentType',
    'platformCount',
    'platformNames',
    'isFirstPost',
    'status'
  ),
  post_published: allowedProperties('contentType', 'platformCount', 'platformNames', 'isFirstPost'),
  session_started: allowedProperties(),
  feature_used: allowedProperties('featureName', 'context'),
  pricing_page_viewed: allowedProperties('source'),
  plan_selected: allowedProperties('planName', 'billingPeriod'),
  trial_started: allowedProperties('planName', 'billingPeriod'),
  upgrade_initiated: allowedProperties('fromPlan', 'toPlan', 'billingPeriod'),
  payment_completed: allowedProperties('planName', 'billingPeriod', 'amount'),
  payment_failed: allowedProperties('planName', 'billingPeriod', 'amount', 'failureCode'),
  referral_link_viewed: allowedProperties('referrerId'),
  referral_link_shared: allowedProperties('channel', 'referrerId'),
  referral_signup: allowedProperties('referrerId', 'method'),
};

export const analyticsEventSchema = z
  .object({
    eventId: z.string().regex(/^[A-Za-z0-9:_-]{8,200}$/),
    name: analyticsEventNameSchema,
    properties: analyticsPropertiesSchema.default({}),
  })
  .strict()
  .superRefine((event, context) => {
    const allowed = eventPropertyAllowList[event.name];
    for (const property of Object.keys(event.properties) as Array<keyof AnalyticsProperties>) {
      if (!allowed.has(property)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['properties', property],
          message: `${property} is not allowed for ${event.name}`,
        });
      }
    }
  });

export const analyticsBatchSchema = z
  .object({ events: z.array(analyticsEventSchema).min(1).max(50) })
  .strict();

export type ValidatedAnalyticsEvent = z.infer<typeof analyticsEventSchema>;

export function normalizedDimensions(properties: AnalyticsProperties) {
  return {
    campaignId: properties.campaignId,
    campaignVersion: properties.campaignVersion,
    contentId: properties.contentId,
    variantId: properties.variantId,
    platform: properties.platform ?? properties.platformName,
    publishAttemptId: properties.publishAttemptId,
    providerPostId: properties.providerPostId,
    campaignToken: properties.campaignToken,
    utmSource: properties.utmSource ?? properties.utm_source,
    utmMedium: properties.utmMedium ?? properties.utm_medium,
    utmCampaign: properties.utmCampaign ?? properties.utm_campaign,
    utmContent: properties.utmContent ?? properties.utm_content,
    landingPage: properties.landingPage ?? properties.url,
  };
}
