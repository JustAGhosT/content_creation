/**
 * Platform Connections Settings Page
 *
 * X uses a server-owned OAuth lifecycle. Tokens never enter browser state.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { platforms, platformConfigurations } from '@/lib/config/platforms';
import { apiClient } from '@/lib/api-client';
import { useAnalytics } from '@/hooks/useAnalytics';
import styles from '@/styles/PlatformSettings.module.css';

interface PlatformConnection {
  platform: 'twitter';
  connected: boolean;
  configured: boolean;
  status: 'connected' | 'expired' | 'revoked';
  username?: string;
  scopes: string[];
  expiresAt?: string;
  connectedAt?: string;
}

interface PlatformConnectionsResponse {
  connections: {
    twitter: PlatformConnection;
  };
}

type ModalState = { type: 'disconnect'; platformSlug: string } | null;

function getPlatformIconLetter(slug: string): string {
  const map: Record<string, string> = {
    facebook: 'f',
    instagram: 'Ig',
    linkedin: 'in',
    twitter: 'X',
  };
  return map[slug] ?? slug.charAt(0).toUpperCase();
}

function getIconColorClass(slug: string): string {
  const map: Record<string, string> = {
    facebook: styles.iconFacebook,
    instagram: styles.iconInstagram,
    linkedin: styles.iconLinkedin,
    twitter: styles.iconTwitter,
  };
  return map[slug] ?? '';
}

const settingsPlatforms = platforms.filter(platform => platform.slug !== 'custom-channel');

export function PlatformSettingsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<PlatformConnectionsResponse['connections']>();
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [operationError, setOperationError] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const { track } = useAnalytics();

  const loadConnections = useCallback(async () => {
    try {
      const response = await apiClient.get<PlatformConnectionsResponse>(
        '/api/platforms/connections'
      );
      setConnections(response.connections);
    } catch {
      setOperationError('Platform connection status could not be loaded.');
    } finally {
      setConnectionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login');
      return;
    }
    if (isAuthenticated) void loadConnections();
  }, [isAuthenticated, isLoading, loadConnections, router]);

  useEffect(() => {
    const outcome = searchParams.get('xConnection');
    if (outcome === 'success') {
      track('platform_connected', { platformName: 'X' });
    } else if (outcome === 'denied') {
      setOperationError('X authorization was cancelled.');
    } else if (outcome === 'invalid') {
      setOperationError('The X authorization request expired or could not be verified.');
    } else if (outcome === 'failed') {
      setOperationError('X could not be connected. Please try again.');
    }
    if (outcome) router.replace('/settings/platforms');
  }, [router, searchParams, track]);

  const handleConnect = useCallback(async (platformSlug: string) => {
    if (platformSlug !== 'twitter') return;
    setOperationError('');
    try {
      const response = await apiClient.post<{ authorizationUrl: string }>(
        '/api/platforms/x/connect'
      );
      globalThis.location.assign(response.authorizationUrl);
    } catch {
      setOperationError('X authorization could not be started.');
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    setOperationError('');
    try {
      const response = await apiClient.delete<{ disconnected: boolean }>('/api/platforms/x');
      setModal(null);
      await loadConnections();
      if (!response.disconnected) {
        setOperationError(
          'The X connection changed before it could be disconnected. Review it and try again.'
        );
        return;
      }
      track('platform_disconnected', { platformName: 'X', totalPlatforms: 0 });
    } catch {
      setOperationError('X could not be disconnected. Please try again.');
    }
  }, [loadConnections, track]);

  if (isLoading || (isAuthenticated && connectionsLoading)) {
    return <LoadingSpinner size="lg" label="Loading..." />;
  }
  if (!isAuthenticated) return null;

  return (
    <>
      <div className={styles.pageHeader}>
        <h1>Platform Connections</h1>
        <p>Connect your social media accounts to publish content across platforms.</p>
      </div>

      {operationError && <div className={styles.mockNotice}>{operationError}</div>}

      <div className={styles.platformGrid}>
        {settingsPlatforms.map(platform => {
          const connection = platform.slug === 'twitter' ? connections?.twitter : undefined;
          const isConnected = Boolean(connection?.connected);
          const requiresReconnect = connection?.status === 'expired';
          const requiresConfiguration =
            platform.slug === 'twitter' && connection?.configured === false;
          const config = platformConfigurations[platform.slug];
          const isComingSoon = platform.comingSoon;

          return (
            <div
              key={platform.slug}
              className={`${styles.platformCard} ${isConnected ? styles.platformCardConnected : ''} ${
                isComingSoon ? styles.platformCardComingSoon : ''
              }`}
            >
              <div className={styles.cardTop}>
                <div className={`${styles.platformIcon} ${getIconColorClass(platform.slug)}`}>
                  {getPlatformIconLetter(platform.slug)}
                </div>
                <div className={styles.platformInfo}>
                  <h3>{platform.name}</h3>
                  {platform.description && (
                    <p className={styles.platformDescription}>{platform.description}</p>
                  )}
                </div>
              </div>

              <div>
                <span
                  className={`${styles.statusBadge} ${
                    isComingSoon
                      ? styles.statusComingSoon
                      : isConnected
                        ? styles.statusConnected
                        : styles.statusDisconnected
                  }`}
                >
                  <span
                    className={`${styles.statusDot} ${
                      isComingSoon
                        ? styles.statusDotComingSoon
                        : isConnected
                          ? styles.statusDotConnected
                          : styles.statusDotDisconnected
                    }`}
                  />
                  {isComingSoon
                    ? 'Coming Soon'
                    : requiresConfiguration
                      ? 'Configuration Required'
                      : requiresReconnect
                        ? 'Reconnect Required'
                        : isConnected
                          ? 'Connected'
                          : 'Not Connected'}
                </span>
              </div>

              {connection?.username && (
                <div className={styles.connectedInfo}>
                  <strong>Handle:</strong> @{connection.username}
                </div>
              )}

              {config?.capabilities && (
                <div className={styles.capabilities}>
                  {config.capabilities.map(capability => (
                    <span key={capability} className={styles.capabilityTag}>
                      {capability}
                    </span>
                  ))}
                </div>
              )}

              <div className={styles.cardActions}>
                {isConnected ? (
                  <button
                    className={`${styles.connectButton} ${styles.connectButtonDanger}`}
                    onClick={() => setModal({ type: 'disconnect', platformSlug: platform.slug })}
                  >
                    Disconnect
                  </button>
                ) : (
                  <>
                    <button
                      className={`${styles.connectButton} ${styles.connectButtonPrimary}`}
                      onClick={() => void handleConnect(platform.slug)}
                      disabled={
                        isComingSoon || platform.slug !== 'twitter' || requiresConfiguration
                      }
                    >
                      {isComingSoon ? 'Coming Soon' : requiresReconnect ? 'Reconnect' : 'Connect'}
                    </button>
                    {requiresReconnect && (
                      <button
                        className={`${styles.connectButton} ${styles.connectButtonDanger}`}
                        onClick={() =>
                          setModal({ type: 'disconnect', platformSlug: platform.slug })
                        }
                      >
                        Remove
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modal?.type === 'disconnect' && (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={event => event.stopPropagation()}>
            <h2>Disconnect X?</h2>
            <p className={styles.confirmText}>
              OmniPost will revoke the authorization and remove its stored tokens.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalButtonCancel} onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className={styles.modalButtonDanger} onClick={() => void handleDisconnect()}>
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PlatformSettingsPage;
