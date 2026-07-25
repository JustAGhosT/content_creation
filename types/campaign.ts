/**
 * Campaign Types
 * Defines the data structures for multi-platform content campaigns
 */

/**
 * Campaign status lifecycle
 */
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';

/**
 * Content type within a campaign
 */
export type CampaignContentType = 'series-article' | 'standalone' | 'thread' | 'announcement';

/**
 * Post status in the publishing pipeline
 */
export type PostStatus = 'pending' | 'scheduled' | 'queued' | 'published' | 'failed';

/**
 * Posting frequency options
 */
export type PostFrequency = 'hourly' | 'daily' | 'weekly' | 'custom';

/**
 * Platform-specific engagement metrics
 */
export interface PlatformEngagement {
  impressions: number;
  engagements: number;
  clicks: number;
  shares: number;
  comments: number;
  likes?: number;
  retweets?: number;
}

/**
 * Platform-specific content adaptation
 */
export interface PlatformAdaptation {
  variantId: string;
  platformId: string;
  platformName: string;
  content: string;
  mediaUrls?: string[];
  hashtags?: string[];
  mentions?: string[];
  scheduledTime?: string;
  status: PostStatus;
  publishedAt?: string;
  publishedUrl?: string;
  engagementMetrics?: PlatformEngagement;
  error?: string;
}

/**
 * Content item within a campaign
 */
export interface CampaignContent {
  id: string;
  type: CampaignContentType;
  sourceId?: string;
  sourceType?: 'series' | 'external';
  title: string;
  body: string;
  summary?: string;
  adaptations: PlatformAdaptation[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Platform configuration within a campaign
 */
export interface CampaignPlatform {
  platformId: string;
  platformName: string;
  enabled: boolean;
  config: {
    postFrequency: PostFrequency;
    bestTimes?: string[];
    hashtagStrategy?: string[];
    threadEnabled?: boolean;
    maxPostLength?: number;
    defaultHashtags?: string[];
  };
}

/**
 * Scheduled post entry
 */
export interface ScheduledPost {
  id: string;
  contentId: string;
  platformId: string;
  adaptationIndex: number;
  scheduledTime: string;
  status: PostStatus;
  publishedAt?: string;
  error?: string;
}

/**
 * Campaign schedule configuration
 */
export interface CampaignSchedule {
  startDate: string;
  endDate?: string;
  timezone: string;
  posts: ScheduledPost[];
}

/**
 * Campaign metrics summary
 */
export interface CampaignMetrics {
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  failedPosts: number;
  totalEngagement: number;
  platformMetrics: Record<string, PlatformEngagement>;
}

/**
 * Main Campaign interface
 */
export interface Campaign {
  id: string;
  name: string;
  description: string;
  status: CampaignStatus;

  // Content Sources
  seriesIds: string[];
  contentItems: CampaignContent[];

  // Platform Configuration
  platforms: CampaignPlatform[];

  // Scheduling
  schedule: CampaignSchedule;

  // Metrics
  metrics: CampaignMetrics;

  // Metadata
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

/**
 * Campaign creation input (partial Campaign)
 */
export interface CreateCampaignInput {
  name: string;
  description?: string;
  seriesIds?: string[];
  platforms?: string[];
  tags?: string[];
  schedule?: Partial<CampaignSchedule>;
}

/**
 * Campaign update input
 */
export interface UpdateCampaignInput {
  name?: string;
  description?: string;
  status?: CampaignStatus;
  seriesIds?: string[];
  tags?: string[];
}

/**
 * Twitter-specific thread structure
 */
export interface TwitterThread {
  id: string;
  tweets: {
    order: number;
    content: string;
    mediaUrls?: string[];
    inReplyTo?: string;
  }[];
}

/**
 * Content adaptation request
 */
export interface AdaptContentRequest {
  content: string;
  targetPlatform: string;
  options?: {
    maxLength?: number;
    includeHashtags?: boolean;
    tone?: 'professional' | 'casual' | 'technical';
    threadize?: boolean;
  };
}

/**
 * Default platform configurations
 */
export const DEFAULT_PLATFORM_CONFIGS: Record<string, CampaignPlatform['config']> = {
  twitter: {
    postFrequency: 'daily',
    bestTimes: ['09:00', '12:00', '17:00'],
    threadEnabled: true,
    maxPostLength: 280,
    defaultHashtags: [],
  },
  linkedin: {
    postFrequency: 'weekly',
    bestTimes: ['08:00', '12:00'],
    threadEnabled: false,
    maxPostLength: 3000,
    defaultHashtags: [],
  },
  facebook: {
    postFrequency: 'daily',
    bestTimes: ['09:00', '13:00', '16:00'],
    threadEnabled: false,
    maxPostLength: 63206,
    defaultHashtags: [],
  },
  instagram: {
    postFrequency: 'daily',
    bestTimes: ['11:00', '14:00', '19:00'],
    threadEnabled: false,
    maxPostLength: 2200,
    defaultHashtags: [],
  },
};

/**
 * Helper to create empty campaign metrics
 */
export function createEmptyMetrics(): CampaignMetrics {
  return {
    totalPosts: 0,
    publishedPosts: 0,
    scheduledPosts: 0,
    failedPosts: 0,
    totalEngagement: 0,
    platformMetrics: {},
  };
}

/**
 * Helper to create empty schedule
 */
export function createEmptySchedule(): CampaignSchedule {
  return {
    startDate: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    posts: [],
  };
}
