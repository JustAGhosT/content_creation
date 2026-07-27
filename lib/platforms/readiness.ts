import { getPlatformBySlug } from '@/lib/config/platforms';
import { isPlatformTokenEncryptionConfigured } from '@/lib/platforms/x/crypto';
import { isXOAuthClientConfigured } from '@/lib/platforms/x/oauth';
import { getXConnectionStatus } from '@/lib/platforms/x/repository';

export type PublishReadiness =
  | { canPublish: true; platform: 'twitter' }
  | {
      canPublish: false;
      platform: string;
      reason: 'unknown' | 'coming_soon' | 'unconfigured' | 'disconnected';
      message: string;
    };

export async function getPublishReadiness(
  userId: string,
  platformSlug: string
): Promise<PublishReadiness> {
  const normalizedSlug = platformSlug.toLowerCase();
  const platform = getPlatformBySlug(normalizedSlug);
  if (!platform) {
    return {
      canPublish: false,
      platform: normalizedSlug,
      reason: 'unknown',
      message: 'This publishing platform is not supported',
    };
  }
  if (platform.comingSoon || platform.slug !== 'twitter') {
    return {
      canPublish: false,
      platform: platform.slug,
      reason: 'coming_soon',
      message: `${platform.name} publishing is coming soon`,
    };
  }
  if (!isXOAuthClientConfigured() || !isPlatformTokenEncryptionConfigured()) {
    return {
      canPublish: false,
      platform: platform.slug,
      reason: 'unconfigured',
      message: 'X publishing is not configured',
    };
  }
  const connection = await getXConnectionStatus(userId);
  if (!connection.connected) {
    return {
      canPublish: false,
      platform: platform.slug,
      reason: 'disconnected',
      message: 'Connect X before publishing',
    };
  }
  return { canPublish: true, platform: 'twitter' };
}
