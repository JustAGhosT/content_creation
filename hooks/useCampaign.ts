/**
 * Campaign Hook
 * State management for multi-platform content campaigns
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Campaign,
  CampaignContent,
  CampaignPlatform,
  ScheduledPost,
  CreateCampaignInput,
  UpdateCampaignInput,
  PlatformAdaptation,
  createEmptyMetrics,
  createEmptySchedule,
  DEFAULT_PLATFORM_CONFIGS,
  CampaignStatus,
} from '@/types/campaign';
import { platforms as availablePlatforms } from '@/lib/config/platforms';
import { generateCampaignId, generateContentId, generatePostId } from '@/lib/utils/id';

const STORAGE_KEY = 'content-campaigns';
const CANONICAL_X_CAMPAIGN_ID = 'campaign_omnipost_x_live_001';

interface PersistedCampaignEnvelope {
  campaign: Campaign;
  version: number;
  versionId: string;
  snapshotHash: string;
  contentHashes: Record<string, string>;
}

function loadLegacyCampaigns(): Campaign[] {
  if (globalThis.window === undefined) return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading campaigns:', error);
    return [];
  }
}

async function campaignRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      error?: { message?: string };
    } | null;
    throw new Error(
      payload?.message ?? payload?.error?.message ?? `Campaign request failed (${response.status})`
    );
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

async function loadPersistedCampaigns(): Promise<PersistedCampaignEnvelope[]> {
  const result = await campaignRequest<{ campaigns: PersistedCampaignEnvelope[] }>(
    '/api/campaigns'
  );
  return result.campaigns;
}

/**
 * Helper: Update campaign if ID matches
 */
type CampaignUpdater = (campaign: Campaign) => Campaign;

function updateCampaignById(
  campaignId: string,
  updater: CampaignUpdater
): (campaign: Campaign) => Campaign {
  return (c: Campaign) => {
    if (c.id === campaignId) {
      return updater(c);
    }
    return c;
  };
}

/**
 * Helper: Calculate platform metrics for a campaign
 */
function calculatePlatformMetrics(
  platformMetrics: Campaign['metrics']['platformMetrics'],
  platformId: string,
  metrics: Partial<Campaign['metrics']['platformMetrics'][string]>
): Campaign['metrics']['platformMetrics'] {
  const defaultMetrics = {
    impressions: 0,
    engagements: 0,
    clicks: 0,
    shares: 0,
    comments: 0,
  };

  return {
    ...platformMetrics,
    [platformId]: {
      ...(platformMetrics[platformId] || defaultMetrics),
      ...metrics,
    },
  };
}

/**
 * Helper: Calculate total engagement from platform metrics
 */
function calculateTotalEngagement(platformMetrics: Campaign['metrics']['platformMetrics']): number {
  return Object.values(platformMetrics).reduce((sum, m) => sum + (m.engagements || 0), 0);
}

/**
 * Helper to update a content item's adaptations
 */
function updateContentItemAdaptations(
  item: CampaignContent,
  contentId: string,
  updater: (adaptations: PlatformAdaptation[]) => PlatformAdaptation[]
): CampaignContent {
  if (item.id !== contentId) return item;
  return {
    ...item,
    adaptations: updater(item.adaptations),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Helper to filter content from schedule posts
 */
function filterSchedulePosts(
  schedule: Campaign['schedule'],
  contentId: string
): Campaign['schedule'] {
  return {
    ...schedule,
    posts: schedule.posts.filter(p => p.contentId !== contentId),
  };
}

/**
 * Helper to update a single content item by ID
 */
function updateContentItem(
  item: CampaignContent,
  contentId: string,
  updates: Partial<CampaignContent>
): CampaignContent {
  if (item.id !== contentId) return item;
  return { ...item, ...updates, updatedAt: new Date().toISOString() };
}

/**
 * Helper to toggle a platform's enabled state
 */
function togglePlatformEnabled(platform: CampaignPlatform, platformId: string): CampaignPlatform {
  if (platform.platformId !== platformId) return platform;
  return { ...platform, enabled: !platform.enabled };
}

/**
 * Helper to update a platform's config
 */
function updatePlatformConfigById(
  platform: CampaignPlatform,
  platformId: string,
  config: Partial<CampaignPlatform['config']>
): CampaignPlatform {
  if (platform.platformId !== platformId) return platform;
  return { ...platform, config: { ...platform.config, ...config } };
}

/**
 * Helper to update an adaptation by platform ID
 */
function updateAdaptationByPlatformId(
  adaptation: PlatformAdaptation,
  platformId: string,
  updates: Partial<PlatformAdaptation>
): PlatformAdaptation {
  if (adaptation.platformId !== platformId) return adaptation;
  return { ...adaptation, ...updates };
}

/**
 * Metrics result type for calculateCampaignMetrics
 */
interface CampaignMetricsResult {
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  failedPosts: number;
}

/**
 * Helper to calculate campaign metrics from content items
 */
function calculateCampaignMetrics(contentItems: CampaignContent[]): CampaignMetricsResult {
  let totalPosts = 0;
  let publishedPosts = 0;
  let scheduledPosts = 0;
  let failedPosts = 0;

  const allAdaptations = contentItems.flatMap(item => item.adaptations);
  for (const adaptation of allAdaptations) {
    totalPosts++;
    if (adaptation.status === 'published') publishedPosts++;
    if (adaptation.status === 'scheduled') scheduledPosts++;
    if (adaptation.status === 'failed') failedPosts++;
  }

  return { totalPosts, publishedPosts, scheduledPosts, failedPosts };
}

/**
 * Campaign hook return type
 */
export interface UseCampaignReturn {
  // State
  campaigns: Campaign[];
  selectedCampaign: Campaign | null;
  isLoading: boolean;
  error: string | null;

  // Selection
  selectCampaign: (id: string | null) => void;
  getCampaign: (id: string) => Campaign | undefined;

  // CRUD Operations
  createCampaign: (input: CreateCampaignInput) => Campaign;
  updateCampaign: (id: string, updates: UpdateCampaignInput) => Campaign | null;
  deleteCampaign: (id: string) => boolean;
  duplicateCampaign: (id: string) => Campaign | null;

  // Status Management
  updateStatus: (id: string, status: CampaignStatus) => Campaign | null;
  pauseCampaign: (id: string) => Campaign | null;
  resumeCampaign: (id: string) => Campaign | null;

  // Series Integration
  addSeriesToCampaign: (campaignId: string, seriesId: string) => Campaign | null;
  removeSeriesFromCampaign: (campaignId: string, seriesId: string) => Campaign | null;

  // Content Management
  addContent: (
    campaignId: string,
    content: Omit<CampaignContent, 'id' | 'createdAt' | 'updatedAt'>
  ) => Campaign | null;
  updateContent: (
    campaignId: string,
    contentId: string,
    updates: Partial<CampaignContent>
  ) => Campaign | null;
  removeContent: (campaignId: string, contentId: string) => Campaign | null;

  // Platform Management
  togglePlatform: (campaignId: string, platformId: string) => Campaign | null;
  updatePlatformConfig: (
    campaignId: string,
    platformId: string,
    config: Partial<CampaignPlatform['config']>
  ) => Campaign | null;

  // Content Adaptation
  addAdaptation: (
    campaignId: string,
    contentId: string,
    adaptation: Omit<PlatformAdaptation, 'status'>
  ) => Campaign | null;
  updateAdaptation: (
    campaignId: string,
    contentId: string,
    platformId: string,
    updates: Partial<PlatformAdaptation>
  ) => Campaign | null;

  // Scheduling
  schedulePost: (campaignId: string, post: Omit<ScheduledPost, 'id' | 'status'>) => Campaign | null;
  reschedulePost: (campaignId: string, postId: string, newTime: string) => Campaign | null;
  cancelScheduledPost: (campaignId: string, postId: string) => Campaign | null;

  // Publishing
  markAsPublished: (
    campaignId: string,
    contentId: string,
    platformId: string,
    publishedUrl?: string
  ) => Campaign | null;
  markAsFailed: (
    campaignId: string,
    contentId: string,
    platformId: string,
    error: string
  ) => Campaign | null;

  // Metrics
  updateMetrics: (
    campaignId: string,
    platformId: string,
    metrics: Partial<Campaign['metrics']['platformMetrics'][string]>
  ) => Campaign | null;
  recalculateMetrics: (campaignId: string) => Campaign | null;
}

/**
 * Main campaign hook
 *
 * Uses the authenticated campaign API as the system of record. Browser-local
 * campaigns are imported once for backwards compatibility and then removed.
 */
export function useCampaign(): UseCampaignReturn {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const persistedRef = useRef(new Map<string, PersistedCampaignEnvelope>());
  const syncedSnapshotsRef = useRef(new Map<string, string>());
  const persistenceQueueRef = useRef<Promise<void>>(Promise.resolve());
  const persistenceReadyRef = useRef(false);

  // Mark as mounted after first render (client-side only)
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Load server-authoritative campaigns and migrate legacy browser data once.
  useEffect(() => {
    if (!hasMounted) return;

    let cancelled = false;
    setIsLoading(true);
    void (async () => {
      try {
        // Reconcile the reviewed Git campaign before importing older browser data.
        await campaignRequest<PersistedCampaignEnvelope>('/api/campaigns/import', {
          method: 'POST',
        }).catch(importError => {
          console.warn('Canonical campaign import was not applied:', importError);
        });

        const persisted = await loadPersistedCampaigns();
        const persistedIds = new Set(persisted.map(item => item.campaign.id));
        const legacy = loadLegacyCampaigns();
        let migrationComplete = true;

        for (const campaign of legacy) {
          if (campaign.id === CANONICAL_X_CAMPAIGN_ID || persistedIds.has(campaign.id)) {
            continue;
          }
          try {
            const imported = await campaignRequest<PersistedCampaignEnvelope>('/api/campaigns', {
              method: 'POST',
              body: JSON.stringify({ campaign, source: 'browser-import' }),
            });
            persisted.push(imported);
            persistedIds.add(campaign.id);
          } catch (migrationError) {
            migrationComplete = false;
            console.error('Failed to import legacy campaign:', migrationError);
          }
        }

        if (legacy.length > 0 && migrationComplete) {
          localStorage.removeItem(STORAGE_KEY);
        }
        if (cancelled) return;

        const byId = new Map(persisted.map(item => [item.campaign.id, item]));
        persistedRef.current = byId;
        syncedSnapshotsRef.current = new Map(
          persisted.map(item => [item.campaign.id, JSON.stringify(item.campaign)])
        );
        setCampaigns(persisted.map(item => item.campaign));
        persistenceReadyRef.current = true;
        setError(
          migrationComplete
            ? null
            : 'Some browser campaigns could not be imported; local copies remain.'
        );
      } catch (loadError) {
        if (cancelled) return;
        const message = loadError instanceof Error ? loadError.message : 'Failed to load campaigns';
        setError(message);
        console.error('Error loading campaigns:', loadError);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasMounted]);

  // Persist optimistic local edits as immutable server-side versions.
  useEffect(() => {
    if (!hasMounted || isLoading || !persistenceReadyRef.current) return;

    const timeout = globalThis.setTimeout(() => {
      const snapshot = campaigns;
      persistenceQueueRef.current = persistenceQueueRef.current
        .then(async () => {
          const currentIds = new Set(snapshot.map(campaign => campaign.id));
          for (const [id] of persistedRef.current) {
            if (!currentIds.has(id)) {
              await campaignRequest<void>(`/api/campaigns/${encodeURIComponent(id)}`, {
                method: 'DELETE',
              });
              persistedRef.current.delete(id);
              syncedSnapshotsRef.current.delete(id);
            }
          }

          for (const campaign of snapshot) {
            const serialized = JSON.stringify(campaign);
            if (syncedSnapshotsRef.current.get(campaign.id) === serialized) continue;

            const existing = persistedRef.current.get(campaign.id);
            const persisted = await campaignRequest<PersistedCampaignEnvelope>(
              existing ? `/api/campaigns/${encodeURIComponent(campaign.id)}` : '/api/campaigns',
              {
                method: existing ? 'PUT' : 'POST',
                body: JSON.stringify({
                  campaign,
                  source: 'user',
                  ...(existing ? { expectedVersion: existing.version } : {}),
                }),
              }
            );
            persistedRef.current.set(campaign.id, persisted);
            syncedSnapshotsRef.current.set(campaign.id, serialized);
          }
          setError(null);
        })
        .catch(persistenceError => {
          const message =
            persistenceError instanceof Error
              ? persistenceError.message
              : 'Failed to persist campaign changes';
          setError(message);
          console.error('Error persisting campaigns:', persistenceError);
        });
    }, 250);

    return () => globalThis.clearTimeout(timeout);
  }, [campaigns, isLoading, hasMounted]);

  // Get selected campaign
  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId) || null;

  // Selection
  const selectCampaign = useCallback((id: string | null) => {
    setSelectedCampaignId(id);
  }, []);

  const getCampaign = useCallback(
    (id: string) => {
      return campaigns.find(c => c.id === id);
    },
    [campaigns]
  );

  // Create campaign
  const createCampaign = useCallback((input: CreateCampaignInput): Campaign => {
    const now = new Date().toISOString();

    // Initialize platforms
    const campaignPlatforms: CampaignPlatform[] = availablePlatforms.map(p => ({
      platformId: p.slug,
      platformName: p.name,
      enabled: input.platforms?.includes(p.slug) || false,
      config: DEFAULT_PLATFORM_CONFIGS[p.slug] || {
        postFrequency: 'daily',
        bestTimes: ['09:00', '12:00'],
        threadEnabled: false,
      },
    }));

    const newCampaign: Campaign = {
      id: generateCampaignId(),
      name: input.name,
      description: input.description || '',
      status: 'draft',
      seriesIds: input.seriesIds || [],
      contentItems: [],
      platforms: campaignPlatforms,
      schedule: input.schedule
        ? { ...createEmptySchedule(), ...input.schedule }
        : createEmptySchedule(),
      metrics: createEmptyMetrics(),
      createdAt: now,
      updatedAt: now,
      tags: input.tags || [],
    };

    setCampaigns(prev => [...prev, newCampaign]);
    return newCampaign;
  }, []);

  // Update campaign
  const updateCampaign = useCallback(
    (id: string, updates: UpdateCampaignInput): Campaign | null => {
      let updated: Campaign | null = null;
      setCampaigns(prev =>
        prev.map(c => {
          if (c.id === id) {
            updated = {
              ...c,
              ...updates,
              updatedAt: new Date().toISOString(),
            };
            return updated;
          }
          return c;
        })
      );
      return updated;
    },
    []
  );

  // Delete campaign
  const deleteCampaign = useCallback(
    (id: string): boolean => {
      const exists = campaigns.some(c => c.id === id);
      if (exists) {
        setCampaigns(prev => prev.filter(c => c.id !== id));
        if (selectedCampaignId === id) {
          setSelectedCampaignId(null);
        }
      }
      return exists;
    },
    [campaigns, selectedCampaignId]
  );

  // Duplicate campaign
  const duplicateCampaign = useCallback(
    (id: string): Campaign | null => {
      const source = campaigns.find(c => c.id === id);
      if (!source) return null;

      const now = new Date().toISOString();
      const duplicated: Campaign = {
        ...JSON.parse(JSON.stringify(source)),
        id: generateCampaignId(),
        name: `${source.name} (Copy)`,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        metrics: createEmptyMetrics(),
      };

      // Reset content IDs and statuses
      duplicated.contentItems = duplicated.contentItems.map(item => {
        const contentId = generateContentId();
        return {
          ...item,
          id: contentId,
          adaptations: item.adaptations.map(a => ({
            ...a,
            variantId: `variant_${contentId}_${a.platformId}`,
            status: 'pending' as const,
            publishedAt: undefined,
            publishedUrl: undefined,
            engagementMetrics: undefined,
          })),
        };
      });

      duplicated.schedule.posts = [];

      setCampaigns(prev => [...prev, duplicated]);
      return duplicated;
    },
    [campaigns]
  );

  // Status management
  const updateStatus = useCallback(
    (id: string, status: CampaignStatus): Campaign | null => {
      return updateCampaign(id, { status });
    },
    [updateCampaign]
  );

  const pauseCampaign = useCallback(
    (id: string): Campaign | null => {
      return updateStatus(id, 'paused');
    },
    [updateStatus]
  );

  const resumeCampaign = useCallback(
    (id: string): Campaign | null => {
      const campaign = campaigns.find(c => c.id === id);
      if (!campaign) return null;
      const newStatus = campaign.schedule.posts.some(p => p.status === 'scheduled')
        ? 'scheduled'
        : 'active';
      return updateStatus(id, newStatus);
    },
    [campaigns, updateStatus]
  );

  // Series integration
  const addSeriesToCampaign = useCallback(
    (campaignId: string, seriesId: string): Campaign | null => {
      let updated: Campaign | null = null;
      setCampaigns(prev =>
        prev.map(c => {
          if (c.id === campaignId && !c.seriesIds.includes(seriesId)) {
            updated = {
              ...c,
              seriesIds: [...c.seriesIds, seriesId],
              updatedAt: new Date().toISOString(),
            };
            return updated;
          }
          return c;
        })
      );
      return updated;
    },
    []
  );

  const removeSeriesFromCampaign = useCallback(
    (campaignId: string, seriesId: string): Campaign | null => {
      let updated: Campaign | null = null;
      const filterSeriesId = (id: string) => id !== seriesId;
      setCampaigns(prev =>
        prev.map(c => {
          if (c.id === campaignId) {
            updated = {
              ...c,
              seriesIds: c.seriesIds.filter(filterSeriesId),
              updatedAt: new Date().toISOString(),
            };
            return updated;
          }
          return c;
        })
      );
      return updated;
    },
    []
  );

  // Content management
  const addContent = useCallback(
    (
      campaignId: string,
      content: Omit<CampaignContent, 'id' | 'createdAt' | 'updatedAt'>
    ): Campaign | null => {
      const now = new Date().toISOString();
      let updated: Campaign | null = null;
      setCampaigns(prev =>
        prev.map(c => {
          if (c.id === campaignId) {
            const newContent: CampaignContent = {
              ...content,
              id: generateContentId(),
              createdAt: now,
              updatedAt: now,
            };
            updated = {
              ...c,
              contentItems: [...c.contentItems, newContent],
              updatedAt: now,
            };
            return updated;
          }
          return c;
        })
      );
      return updated;
    },
    []
  );

  const updateContent = useCallback(
    (campaignId: string, contentId: string, updates: Partial<CampaignContent>): Campaign | null => {
      let updated: Campaign | null = null;
      const mapItem = (item: CampaignContent) => updateContentItem(item, contentId, updates);
      setCampaigns(prev =>
        prev.map(c => {
          if (c.id === campaignId) {
            updated = {
              ...c,
              contentItems: c.contentItems.map(mapItem),
              updatedAt: new Date().toISOString(),
            };
            return updated;
          }
          return c;
        })
      );
      return updated;
    },
    []
  );

  const removeContent = useCallback((campaignId: string, contentId: string): Campaign | null => {
    let updated: Campaign | null = null;
    const filterContent = (item: CampaignContent) => item.id !== contentId;

    const updateCampaignContent = (c: Campaign): Campaign => {
      const filteredSchedule = filterSchedulePosts(c.schedule, contentId);
      const hasScheduledPosts = filteredSchedule.posts.some(post => post.status === 'scheduled');

      // If campaign was scheduled but no scheduled posts remain, revert to draft
      const newStatus: CampaignStatus =
        c.status === 'scheduled' && !hasScheduledPosts ? 'draft' : c.status;

      return {
        ...c,
        contentItems: c.contentItems.filter(filterContent),
        schedule: filteredSchedule,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
    };

    setCampaigns(prev =>
      prev.map(c => {
        if (c.id === campaignId) {
          updated = updateCampaignContent(c);
          return updated;
        }
        return c;
      })
    );
    return updated;
  }, []);

  // Platform management
  const togglePlatform = useCallback((campaignId: string, platformId: string): Campaign | null => {
    let updated: Campaign | null = null;
    const mapPlatform = (p: CampaignPlatform) => togglePlatformEnabled(p, platformId);
    setCampaigns(prev =>
      prev.map(c => {
        if (c.id === campaignId) {
          updated = {
            ...c,
            platforms: c.platforms.map(mapPlatform),
            updatedAt: new Date().toISOString(),
          };
          return updated;
        }
        return c;
      })
    );
    return updated;
  }, []);

  const updatePlatformConfig = useCallback(
    (
      campaignId: string,
      platformId: string,
      config: Partial<CampaignPlatform['config']>
    ): Campaign | null => {
      let updated: Campaign | null = null;
      const mapPlatform = (p: CampaignPlatform) => updatePlatformConfigById(p, platformId, config);
      setCampaigns(prev =>
        prev.map(c => {
          if (c.id === campaignId) {
            updated = {
              ...c,
              platforms: c.platforms.map(mapPlatform),
              updatedAt: new Date().toISOString(),
            };
            return updated;
          }
          return c;
        })
      );
      return updated;
    },
    []
  );

  // Content adaptation
  const addAdaptation = useCallback(
    (
      campaignId: string,
      contentId: string,
      adaptation: Omit<PlatformAdaptation, 'status'>
    ): Campaign | null => {
      let updated: Campaign | null = null;
      const addToAdaptations = (adaptations: PlatformAdaptation[]) => [
        ...adaptations,
        { ...adaptation, status: 'pending' as const },
      ];
      const mapItem = (item: CampaignContent) =>
        updateContentItemAdaptations(item, contentId, addToAdaptations);
      setCampaigns(prev =>
        prev.map(c => {
          if (c.id === campaignId) {
            updated = {
              ...c,
              contentItems: c.contentItems.map(mapItem),
              updatedAt: new Date().toISOString(),
            };
            return updated;
          }
          return c;
        })
      );
      return updated;
    },
    []
  );

  const updateAdaptation = useCallback(
    (
      campaignId: string,
      contentId: string,
      platformId: string,
      updates: Partial<PlatformAdaptation>
    ): Campaign | null => {
      let updated: Campaign | null = null;
      const updateAdapt = (a: PlatformAdaptation) =>
        updateAdaptationByPlatformId(a, platformId, updates);
      const updateAdaptations = (adaptations: PlatformAdaptation[]) => adaptations.map(updateAdapt);
      const mapItem = (item: CampaignContent) =>
        updateContentItemAdaptations(item, contentId, updateAdaptations);
      setCampaigns(prev =>
        prev.map(c => {
          if (c.id === campaignId) {
            updated = {
              ...c,
              contentItems: c.contentItems.map(mapItem),
              updatedAt: new Date().toISOString(),
            };
            return updated;
          }
          return c;
        })
      );
      return updated;
    },
    []
  );

  // Scheduling
  const schedulePost = useCallback(
    (campaignId: string, post: Omit<ScheduledPost, 'id' | 'status'>): Campaign | null => {
      let updated: Campaign | null = null;
      setCampaigns(prev =>
        prev.map(c => {
          if (c.id === campaignId) {
            const newPost: ScheduledPost = {
              ...post,
              id: generatePostId(),
              status: 'scheduled',
            };
            updated = {
              ...c,
              schedule: {
                ...c.schedule,
                posts: [...c.schedule.posts, newPost],
              },
              status: c.status === 'draft' ? 'scheduled' : c.status,
              updatedAt: new Date().toISOString(),
            };
            return updated;
          }
          return c;
        })
      );
      return updated;
    },
    []
  );

  const reschedulePost = useCallback(
    (campaignId: string, postId: string, newTime: string): Campaign | null => {
      let updated: Campaign | null = null;

      const updater = (c: Campaign): Campaign => {
        const posts = c.schedule.posts.map(p =>
          p.id === postId ? { ...p, scheduledTime: newTime } : p
        );

        const updatedCampaign = {
          ...c,
          schedule: {
            ...c.schedule,
            posts,
          },
          updatedAt: new Date().toISOString(),
        };

        updated = updatedCampaign;
        return updatedCampaign;
      };

      setCampaigns(prev => prev.map(updateCampaignById(campaignId, updater)));
      return updated;
    },
    []
  );

  const cancelScheduledPost = useCallback((campaignId: string, postId: string): Campaign | null => {
    let updated: Campaign | null = null;

    const computeStatusAfterCancel = (
      c: Campaign,
      filteredPosts: ScheduledPost[]
    ): CampaignStatus => {
      const hasScheduledPosts = filteredPosts.some(p => p.status === 'scheduled');
      // Only revert 'scheduled' campaigns to 'draft'; preserve 'active'/'paused'
      if (c.status === 'scheduled' && !hasScheduledPosts) {
        return 'draft';
      }
      return c.status;
    };

    const updateCampaignSchedule = (c: Campaign): Campaign => {
      const filteredPosts = c.schedule.posts.filter(p => p.id !== postId);
      const newStatus = computeStatusAfterCancel(c, filteredPosts);

      return {
        ...c,
        schedule: {
          ...c.schedule,
          posts: filteredPosts,
        },
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
    };

    setCampaigns(prev =>
      prev.map(c => {
        if (c.id === campaignId) {
          updated = updateCampaignSchedule(c);
          return updated;
        }
        return c;
      })
    );
    return updated;
  }, []);

  // Publishing
  const markAsPublished = useCallback(
    (
      campaignId: string,
      contentId: string,
      platformId: string,
      publishedUrl?: string
    ): Campaign | null => {
      const now = new Date().toISOString();
      return updateAdaptation(campaignId, contentId, platformId, {
        status: 'published',
        publishedAt: now,
        publishedUrl,
      });
    },
    [updateAdaptation]
  );

  const markAsFailed = useCallback(
    (campaignId: string, contentId: string, platformId: string, error: string): Campaign | null => {
      return updateAdaptation(campaignId, contentId, platformId, {
        status: 'failed',
        error,
      });
    },
    [updateAdaptation]
  );

  // Metrics
  const updateMetrics = useCallback(
    (
      campaignId: string,
      platformId: string,
      metrics: Partial<Campaign['metrics']['platformMetrics'][string]>
    ): Campaign | null => {
      let updated: Campaign | null = null;

      const updater = (c: Campaign): Campaign => {
        const platformMetrics = calculatePlatformMetrics(
          c.metrics.platformMetrics,
          platformId,
          metrics
        );
        const totalEngagement = calculateTotalEngagement(platformMetrics);

        const updatedCampaign = {
          ...c,
          metrics: {
            ...c.metrics,
            platformMetrics,
            totalEngagement,
          },
          updatedAt: new Date().toISOString(),
        };

        updated = updatedCampaign;
        return updatedCampaign;
      };

      setCampaigns(prev => prev.map(updateCampaignById(campaignId, updater)));
      return updated;
    },
    []
  );

  const recalculateMetrics = useCallback((campaignId: string): Campaign | null => {
    let updated: Campaign | null = null;
    setCampaigns(prev =>
      prev.map(c => {
        if (c.id === campaignId) {
          const metricsData = calculateCampaignMetrics(c.contentItems);
          updated = {
            ...c,
            metrics: {
              ...c.metrics,
              ...metricsData,
            },
            updatedAt: new Date().toISOString(),
          };
          return updated;
        }
        return c;
      })
    );
    return updated;
  }, []);

  return {
    campaigns,
    selectedCampaign,
    isLoading,
    error,
    selectCampaign,
    getCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    duplicateCampaign,
    updateStatus,
    pauseCampaign,
    resumeCampaign,
    addSeriesToCampaign,
    removeSeriesFromCampaign,
    addContent,
    updateContent,
    removeContent,
    togglePlatform,
    updatePlatformConfig,
    addAdaptation,
    updateAdaptation,
    schedulePost,
    reschedulePost,
    cancelScheduledPost,
    markAsPublished,
    markAsFailed,
    updateMetrics,
    recalculateMetrics,
  };
}

export default useCampaign;
