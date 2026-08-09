/**
 * Analytics Event Taxonomy
 *
 * Defines the AARRR (Acquisition, Activation, Retention, Revenue, Referral)
 * event taxonomy for OmniPost. All events use object_action naming in snake_case.
 *
 * @see .agents/skills/analytics-tracking/SKILL.md
 */

// ── Event Names ──────────────────────────────────────────────────────────

export const AnalyticsEvents = {
  // Governed campaign lifecycle
  CAMPAIGN_CREATED: 'campaign_created',
  CONTENT_APPROVED: 'content_approved',
  PUBLISH_JOB_QUEUED: 'publish_job_queued',
  PUBLISH_ATTEMPTED: 'publish_attempted',
  PUBLISH_SUCCEEDED: 'publish_succeeded',
  PUBLISH_FAILED: 'publish_failed',
  LANDING_VIEW: 'landing_view',
  CTA_CLICKED: 'cta_clicked',

  // Acquisition
  PAGE_VIEWED: 'page_viewed',
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',

  // Activation
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  PLATFORM_CONNECTED: 'platform_connected',
  PLATFORM_DISCONNECTED: 'platform_disconnected',
  POST_CREATED: 'post_created',
  POST_PUBLISHED: 'post_published',

  // Retention
  SESSION_STARTED: 'session_started',
  FEATURE_USED: 'feature_used',

  // Revenue
  PRICING_PAGE_VIEWED: 'pricing_page_viewed',
  PLAN_SELECTED: 'plan_selected',
  TRIAL_STARTED: 'trial_started',
  UPGRADE_INITIATED: 'upgrade_initiated',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',

  // Referral
  REFERRAL_LINK_VIEWED: 'referral_link_viewed',
  REFERRAL_LINK_SHARED: 'referral_link_shared',
  REFERRAL_SIGNUP: 'referral_signup',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

// ── Event Properties ─────────────────────────────────────────────────────

export interface BaseEventProperties {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** User ID (if authenticated) */
  userId?: string;
  /** Anonymous session ID */
  sessionId?: string;
}

export interface UTMProperties {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export interface PageViewProperties extends BaseEventProperties, UTMProperties {
  url: string;
  referrer?: string;
  title?: string;
}

export interface SignupProperties extends BaseEventProperties {
  method: 'email' | 'google' | 'github';
  referralSource?: string;
}

export interface OnboardingStepProperties extends BaseEventProperties {
  stepNumber: number;
  stepName: string;
  skipped: boolean;
}

export interface PlatformConnectedProperties extends BaseEventProperties {
  platformName: string;
  totalPlatforms: number;
}

export interface PostProperties extends BaseEventProperties {
  contentType?: string;
  platformCount: number;
  platformNames: string[];
  isFirstPost?: boolean;
}

export interface PricingProperties extends BaseEventProperties {
  source?: string;
  planName?: string;
  billingPeriod?: 'monthly' | 'annual';
  amount?: number;
  fromPlan?: string;
  toPlan?: string;
}

export interface FeatureUsedProperties extends BaseEventProperties {
  featureName: string;
  context?: string;
}

export interface ReferralProperties extends BaseEventProperties {
  channel?: 'email' | 'twitter' | 'linkedin' | 'copy';
  referrerId?: string;
}

// ── Event Union Type ─────────────────────────────────────────────────────

export type EventProperties =
  | PageViewProperties
  | SignupProperties
  | OnboardingStepProperties
  | PlatformConnectedProperties
  | PostProperties
  | PricingProperties
  | FeatureUsedProperties
  | ReferralProperties
  | BaseEventProperties;

// ── Analytics Event Record ───────────────────────────────────────────────

export interface AnalyticsEvent {
  eventId: string;
  name: AnalyticsEventName;
  properties: EventProperties;
}
