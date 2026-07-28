/**
 * Platform Adapters
 * Platform-specific implementations for content publishing
 */

import {
  PlatformAdapter,
  PlatformPublishContext,
  PlatformPublishResult,
  ValidationResult,
  ScheduledJob,
} from './types';
import { getPlatformConfig } from '@/lib/config/platforms';
import { getValidXAccessToken } from '@/lib/platforms/x/repository';
import { PinterestSandboxClient } from '@/lib/platforms/pinterest/sandbox';
import { generatePlatformPostId } from '@/lib/utils/id';

/**
 * Default timeout values for platform API requests (in milliseconds)
 * LinkedIn/Facebook use longer timeouts for text-heavy API calls
 * Instagram uses shorter timeout as media upload endpoints typically respond faster
 */
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const INSTAGRAM_TIMEOUT_MS = 10000; // 10 seconds for media-focused API

/**
 * Configuration for fetch requests with timeout
 */
interface FetchWithTimeoutOptions {
  url: string;
  method: 'POST' | 'GET' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  body: unknown;
  timeoutMs: number;
  platformName: string;
}

/**
 * Provider HTTP failure with structured status metadata for retry policy.
 * The response shape intentionally matches the subset consumed by RetryHandler.
 */
export class PlatformHttpError extends Error {
  readonly response: { status: number; data?: { message?: string } };

  constructor(platformName: string, status: number, message?: string) {
    const providerMessage = message?.trim();
    super(
      providerMessage
        ? `${platformName} API error: ${status} - ${providerMessage}`
        : `${platformName} API error: ${status}`
    );
    this.name = 'PlatformHttpError';
    this.response = {
      status,
      data: providerMessage ? { message: providerMessage } : undefined,
    };
  }
}

/**
 * Execute a fetch request with timeout handling
 * Centralizes AbortController logic to reduce code duplication
 */
async function fetchWithTimeout<T>(options: FetchWithTimeoutOptions): Promise<T> {
  const { url, method, headers, body, timeoutMs, platformName } = options;

  // AbortController is a global in Node.js 16+ and all modern browsers
  const controller = new globalThis.AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new PlatformHttpError(platformName, response.status, response.statusText);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${platformName} API request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Error class for partial thread publish failures
 * Thrown when some tweets in a thread are published but later ones fail
 */
export class PartialPublishError extends Error {
  constructor(
    message: string,
    public readonly partialResult: {
      tweetIds: string[];
      error: Error;
    }
  ) {
    super(message);
    this.name = 'PartialPublishError';
  }
}

/**
 * Base adapter with common functionality
 */
abstract class BasePlatformAdapter implements PlatformAdapter {
  abstract platformId: string;
  abstract getMaxLength(): number;

  abstract publish(content: ScheduledJob['content']): Promise<PlatformPublishResult>;

  validateContent(content: ScheduledJob['content']): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const maxLength = this.getMaxLength();

    if (!content.text || content.text.trim().length === 0) {
      errors.push('Content text is required');
    }

    if (content.text && content.text.length > maxLength) {
      errors.push(
        `Content exceeds maximum length of ${maxLength} characters (${content.text.length})`
      );
    }

    if (content.hashtags && content.hashtags.length > 10) {
      warnings.push('Using more than 10 hashtags may reduce engagement');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Simulate API call for development
   * NOTE: Uses Math.random() intentionally - only for development simulation
   * and mock IDs, not security-sensitive operations
   */
  protected async simulatePublish(
    content: ScheduledJob['content'],
    platformName: string
  ): Promise<PlatformPublishResult> {
    // Simulate network delay (random delay is acceptable for simulation purposes)
    // NOSONAR: Math.random() is safe here - used only for dev simulation timing, not security
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000)); // NOSONAR

    // Generate mock response using secure ID generation
    const postId = generatePlatformPostId(this.platformId);

    return {
      id: postId,
      url: this.getMockUrl(postId),
      platformData: {
        platform: platformName,
        text: content.text,
        createdAt: new Date().toISOString(),
      },
    };
  }

  protected abstract getMockUrl(postId: string): string;

  protected assertProductionCredentials(config: { apiKey?: string } | undefined): void {
    if (process.env.NODE_ENV === 'production' && !config?.apiKey) {
      throw new Error(`${this.platformId} API key is not configured`);
    }
  }
}

/**
 * Twitter/X Adapter
 */
export class TwitterAdapter extends BasePlatformAdapter {
  platformId = 'twitter';

  constructor(
    private readonly resolveAccessToken: typeof getValidXAccessToken = getValidXAccessToken
  ) {
    super();
  }

  getMaxLength(): number {
    return 280;
  }

  async publish(
    content: ScheduledJob['content'],
    context?: PlatformPublishContext
  ): Promise<PlatformPublishResult> {
    const config = getPlatformConfig('twitter');

    if (process.env.NODE_ENV === 'production') {
      if (!context?.userId) throw new Error('X account owner is required');
      const accessToken = await this.resolveAccessToken(context.userId);
      return this.publishToTwitter(content, {
        apiUrl: config?.apiUrl ?? 'https://api.x.com/2/tweets',
        apiKey: accessToken,
      });
    }

    // Development: simulate
    return this.simulatePublish(content, 'Twitter');
  }

  private async publishToTwitter(
    content: ScheduledJob['content'],
    config: { apiUrl: string; apiKey: string }
  ): Promise<PlatformPublishResult> {
    // Handle threads
    if (content.isThread && content.threadParts) {
      return this.publishThread(content, config);
    }

    // Single tweet
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: this.formatContent(content),
      }),
    });

    if (!response.ok) {
      throw new PlatformHttpError('X', response.status, response.statusText);
    }

    const data = await response.json();

    return {
      id: data.data?.id || data.id,
      url: `https://x.com/i/web/status/${data.data?.id || data.id}`,
      platformData: data,
    };
  }

  private async publishThread(
    content: ScheduledJob['content'],
    config: { apiUrl: string; apiKey: string }
  ): Promise<PlatformPublishResult> {
    const tweetIds: string[] = [];
    let replyToId: string | undefined;

    try {
      for (const part of content.threadParts!) {
        const response = await fetch(config.apiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: part.text,
            reply: replyToId ? { in_reply_to_tweet_id: replyToId } : undefined,
          }),
        });

        if (!response.ok) {
          const error = new PlatformHttpError('X', response.status, response.statusText);
          // If we have already posted some tweets, throw a partial publish error
          if (tweetIds.length > 0) {
            throw new PartialPublishError(
              `Thread partially published: ${tweetIds.length} tweets posted before failure`,
              { tweetIds, error }
            );
          }
          throw error;
        }

        const data = await response.json();
        const tweetId = data.data?.id || data.id;
        tweetIds.push(tweetId);
        replyToId = tweetId;
      }

      return {
        id: tweetIds[0],
        url: `https://x.com/i/web/status/${tweetIds[0]}`,
        platformData: { tweetIds, isThread: true },
      };
    } catch (error) {
      // Re-throw PartialPublishError as-is
      if (error instanceof PartialPublishError) {
        throw error;
      }

      // If we have posted some tweets but caught a different error, wrap it
      if (tweetIds.length > 0) {
        throw new PartialPublishError(
          `Thread partially published: ${tweetIds.length} tweets posted before failure`,
          { tweetIds, error: error as Error }
        );
      }

      throw error;
    }
  }

  private formatContent(content: ScheduledJob['content']): string {
    let text = content.text;

    // Add hashtags if space allows
    if (content.hashtags && content.hashtags.length > 0) {
      const hashtags = content.hashtags.map(h => (h.startsWith('#') ? h : `#${h}`)).join(' ');
      if (text.length + 1 + hashtags.length <= this.getMaxLength()) {
        text = `${text}\n\n${hashtags}`;
      }
    }

    return text;
  }

  protected getMockUrl(postId: string): string {
    return `https://twitter.com/user/status/${postId}`;
  }

  validateContent(content: ScheduledJob['content']): ValidationResult {
    const result = super.validateContent(content);

    // Thread validation
    if (content.isThread && content.threadParts) {
      for (let i = 0; i < content.threadParts.length; i++) {
        const part = content.threadParts[i];
        if (part.text.length > 280) {
          result.errors.push(`Thread part ${i + 1} exceeds 280 characters`);
          result.valid = false;
        }
      }
    }

    return result;
  }
}

/**
 * LinkedIn Adapter
 */
export class LinkedInAdapter extends BasePlatformAdapter {
  platformId = 'linkedin';

  getMaxLength(): number {
    return 3000;
  }

  async publish(content: ScheduledJob['content']): Promise<PlatformPublishResult> {
    const config = getPlatformConfig('linkedin');

    if (config?.apiKey && process.env.NODE_ENV === 'production') {
      return this.publishToLinkedIn(content, config);
    }
    this.assertProductionCredentials(config);

    return this.simulatePublish(content, 'LinkedIn');
  }

  private async publishToLinkedIn(
    content: ScheduledJob['content'],
    config: { apiUrl: string; apiKey: string; timeoutMs?: number }
  ): Promise<PlatformPublishResult> {
    const data = await fetchWithTimeout<{ id: string }>({
      url: config.apiUrl,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        text: this.formatContent(content),
        visibility: 'PUBLIC',
      },
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      platformName: 'LinkedIn',
    });

    return {
      id: data.id,
      url: `https://www.linkedin.com/feed/update/${data.id}`,
      platformData: data,
    };
  }

  private formatContent(content: ScheduledJob['content']): string {
    let text = content.text;

    // LinkedIn prefers fewer hashtags
    if (content.hashtags && content.hashtags.length > 0) {
      const hashtags = content.hashtags
        .slice(0, 5)
        .map(h => (h.startsWith('#') ? h : `#${h}`))
        .join(' ');
      text = `${text}\n\n${hashtags}`;
    }

    return text;
  }

  protected getMockUrl(postId: string): string {
    return `https://www.linkedin.com/feed/update/${postId}`;
  }
}

/**
 * Facebook Adapter
 */
export class FacebookAdapter extends BasePlatformAdapter {
  platformId = 'facebook';

  getMaxLength(): number {
    return 63206;
  }

  async publish(content: ScheduledJob['content']): Promise<PlatformPublishResult> {
    const config = getPlatformConfig('facebook');

    if (config?.apiKey && process.env.NODE_ENV === 'production') {
      return this.publishToFacebook(content, config);
    }
    this.assertProductionCredentials(config);

    return this.simulatePublish(content, 'Facebook');
  }

  private async publishToFacebook(
    content: ScheduledJob['content'],
    config: { apiUrl: string; apiKey: string; timeoutMs?: number }
  ): Promise<PlatformPublishResult> {
    const data = await fetchWithTimeout<{ id: string }>({
      url: config.apiUrl,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        message: content.text,
      },
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      platformName: 'Facebook',
    });

    return {
      id: data.id,
      url: `https://www.facebook.com/${data.id}`,
      platformData: data,
    };
  }

  protected getMockUrl(postId: string): string {
    return `https://www.facebook.com/posts/${postId}`;
  }
}

/**
 * Instagram Adapter
 */
export class InstagramAdapter extends BasePlatformAdapter {
  platformId = 'instagram';

  getMaxLength(): number {
    return 2200;
  }

  async publish(content: ScheduledJob['content']): Promise<PlatformPublishResult> {
    const config = getPlatformConfig('instagram');

    if (config?.apiKey && process.env.NODE_ENV === 'production') {
      return this.publishToInstagram(content, config);
    }
    this.assertProductionCredentials(config);

    return this.simulatePublish(content, 'Instagram');
  }

  private async publishToInstagram(
    content: ScheduledJob['content'],
    config: { apiUrl: string; apiKey: string; timeoutMs?: number }
  ): Promise<PlatformPublishResult> {
    // Instagram requires media for posts
    if (!content.mediaUrls || content.mediaUrls.length === 0) {
      throw new Error('Instagram posts require at least one image');
    }

    const data = await fetchWithTimeout<{ id: string }>({
      url: config.apiUrl,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        caption: this.formatContent(content),
        media_url: content.mediaUrls[0],
      },
      timeoutMs: config.timeoutMs ?? INSTAGRAM_TIMEOUT_MS,
      platformName: 'Instagram',
    });

    return {
      id: data.id,
      url: `https://www.instagram.com/p/${data.id}`,
      platformData: data,
    };
  }

  private formatContent(content: ScheduledJob['content']): string {
    let text = content.text;

    // Instagram uses more hashtags
    if (content.hashtags && content.hashtags.length > 0) {
      const hashtags = content.hashtags.map(h => (h.startsWith('#') ? h : `#${h}`)).join(' ');
      text = `${text}\n\n.\n.\n.\n${hashtags}`;
    }

    return text;
  }

  protected getMockUrl(postId: string): string {
    return `https://www.instagram.com/p/${postId}`;
  }

  validateContent(content: ScheduledJob['content']): ValidationResult {
    const result = super.validateContent(content);

    // Instagram requires media (in production)
    if (process.env.NODE_ENV === 'production') {
      if (!content.mediaUrls || content.mediaUrls.length === 0) {
        result.errors.push('Instagram posts require at least one image');
        result.valid = false;
      }
    }

    return result;
  }
}

/**
 * TikTok Adapter
 */
export class TikTokAdapter extends BasePlatformAdapter {
  platformId = 'tiktok';

  getMaxLength(): number {
    return 2200;
  }

  async publish(content: ScheduledJob['content']): Promise<PlatformPublishResult> {
    const config = getPlatformConfig('tiktok');

    if (config?.apiKey && process.env.NODE_ENV === 'production') {
      return this.publishToTikTok(content, config);
    }
    this.assertProductionCredentials(config);

    return this.simulatePublish(content, 'TikTok');
  }

  private async publishToTikTok(
    content: ScheduledJob['content'],
    config: { apiUrl: string; apiKey: string; timeoutMs?: number }
  ): Promise<PlatformPublishResult> {
    if (!content.mediaUrls || content.mediaUrls.length === 0) {
      throw new Error('TikTok posts require a video URL');
    }

    const privacyLevel = content.tiktokPrivacyLevel || process.env.TIKTOK_PRIVACY_LEVEL;
    if (!privacyLevel) {
      throw new Error('TikTok privacy level is required for direct posts');
    }

    const data = await fetchWithTimeout<{
      data?: { publish_id?: string };
      error?: { code?: string; message?: string };
    }>({
      url: config.apiUrl,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        post_info: {
          title: content.text,
          privacy_level: privacyLevel,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: content.mediaUrls[0],
        },
      },
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      platformName: 'TikTok',
    });

    if (data.error?.code && data.error.code !== 'ok') {
      const message = data.error.message ? ` - ${data.error.message}` : '';
      throw new Error(`TikTok API error: ${data.error.code}${message}`);
    }

    const id = data.data?.publish_id;
    if (!id) {
      throw new Error('TikTok publish response did not include a publish ID');
    }

    return {
      id,
      url: `https://www.tiktok.com/upload?publish_id=${id}`,
      platformData: data,
    };
  }

  protected getMockUrl(postId: string): string {
    return `https://www.tiktok.com/@user/video/${postId}`;
  }

  validateContent(content: ScheduledJob['content']): ValidationResult {
    const result = super.validateContent(content);

    if (!content.mediaUrls || content.mediaUrls.length === 0) {
      result.errors.push('TikTok posts require a video URL');
      result.valid = false;
    }

    return result;
  }
}

/**
 * Pinterest's provider-operated sandbox. This adapter intentionally cannot be
 * pointed at the production API host.
 */
export class PinterestSandboxAdapter extends BasePlatformAdapter {
  platformId = 'pinterest';

  constructor(private readonly client?: PinterestSandboxClient) {
    super();
  }

  getMaxLength(): number {
    return 800;
  }

  async publish(content: ScheduledJob['content']): Promise<PlatformPublishResult> {
    const imageUrl = content.mediaUrls?.[0];
    if (!imageUrl) throw new Error('Pinterest Sandbox posts require an image URL');

    const pin = await (this.client ?? new PinterestSandboxClient()).createPin({
      title: content.text,
      description: this.formatContent(content),
      imageUrl,
    });

    return {
      id: pin.id,
      url: `https://www.pinterest.com/pin/${pin.id}/`,
      platformData: { ...pin, environment: 'sandbox' },
    };
  }

  validateContent(content: ScheduledJob['content']): ValidationResult {
    const result = super.validateContent(content);
    if (!content.mediaUrls?.[0]) {
      result.errors.push('Pinterest Sandbox posts require an image URL');
      result.valid = false;
    }
    return result;
  }

  private formatContent(content: ScheduledJob['content']): string {
    const hashtags = content.hashtags?.map(value => (value.startsWith('#') ? value : `#${value}`));
    return hashtags?.length ? `${content.text}\n\n${hashtags.join(' ')}` : content.text;
  }

  protected getMockUrl(postId: string): string {
    return `https://www.pinterest.com/pin/${postId}/`;
  }
}

/**
 * Adapter registry
 */
const adapters = new Map<string, PlatformAdapter>();
adapters.set('twitter', new TwitterAdapter());
adapters.set('linkedin', new LinkedInAdapter());
adapters.set('facebook', new FacebookAdapter());
adapters.set('instagram', new InstagramAdapter());
adapters.set('tiktok', new TikTokAdapter());
adapters.set('pinterest', new PinterestSandboxAdapter());

/**
 * Get adapter for a platform
 */
export function getAdapter(platformId: string): PlatformAdapter | undefined {
  return adapters.get(platformId);
}

/**
 * Get all available adapters
 */
export function getAllAdapters(): PlatformAdapter[] {
  return Array.from(adapters.values());
}

/**
 * Register a custom adapter
 */
export function registerAdapter(adapter: PlatformAdapter): void {
  adapters.set(adapter.platformId, adapter);
}
