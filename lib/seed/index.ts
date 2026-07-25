/**
 * Seed Data Utilities
 * Load and manage seed data for the application
 */

import { Series } from '@/types/series';
import { Campaign } from '@/types/campaign';
import { aerospaceSeriesSeed } from './aerospace-series';
import { aerospaceCampaignSeed } from './aerospace-campaign';
import { omnipostXCampaignSeed } from './omnipost-x-campaign';

// Storage keys (must match hooks)
const SERIES_STORAGE_KEY = 'content-series';
const CAMPAIGN_STORAGE_KEY = 'content-campaigns';
const SEED_LOADED_KEY = 'seed-data-loaded';

/**
 * All seed series
 */
export const seedSeries: Series[] = [aerospaceSeriesSeed];

/**
 * All seed campaigns
 */
export const seedCampaigns: Campaign[] = [aerospaceCampaignSeed, omnipostXCampaignSeed];

/**
 * Check if seed data has been loaded
 */
export function isSeedLoaded(): boolean {
  if (globalThis.window === undefined) return false;
  return localStorage.getItem(SEED_LOADED_KEY) === 'true';
}

/**
 * Mark seed data as loaded
 */
export function markSeedLoaded(): void {
  if (globalThis.window === undefined) return;
  localStorage.setItem(SEED_LOADED_KEY, 'true');
}

/**
 * Load seed series into localStorage
 */
export function loadSeedSeries(): Series[] {
  if (globalThis.window === undefined) return [];

  try {
    const existingData = localStorage.getItem(SERIES_STORAGE_KEY);
    const existingSeries: Series[] = existingData ? JSON.parse(existingData) : [];

    // Add seed series that don't exist yet
    let modified = false;
    for (const seedItem of seedSeries) {
      const exists = existingSeries.some(s => s.id === seedItem.id);
      if (!exists) {
        existingSeries.push(seedItem);
        modified = true;
      }
    }

    if (modified) {
      localStorage.setItem(SERIES_STORAGE_KEY, JSON.stringify(existingSeries));
    }

    return existingSeries;
  } catch (error) {
    console.error('Error loading seed series:', error);
    return [];
  }
}

/**
 * Return bundled campaign previews.
 *
 * Campaign persistence is server-authoritative. Existing localStorage data is
 * intentionally left untouched so useCampaign can migrate it transactionally.
 */
export function loadSeedCampaigns(): Campaign[] {
  return seedCampaigns;
}

/**
 * Load local-only series seed data and expose bundled campaign previews.
 * Call this once on app initialization
 */
export function loadAllSeedData(): { series: Series[]; campaigns: Campaign[] } {
  const series = loadSeedSeries();
  const campaigns = loadSeedCampaigns();
  markSeedLoaded();

  return { series, campaigns };
}

/**
 * Reset all seed data (clears localStorage and reloads seeds)
 */
export function resetSeedData(): { series: Series[]; campaigns: Campaign[] } {
  if (globalThis.window === undefined) return { series: [], campaigns: [] };

  // Clear existing data
  localStorage.removeItem(SERIES_STORAGE_KEY);
  localStorage.removeItem(CAMPAIGN_STORAGE_KEY);
  localStorage.removeItem(SEED_LOADED_KEY);

  // Reload seed data
  return loadAllSeedData();
}

/**
 * Get seed data statistics
 */
export function getSeedStats() {
  return {
    series: {
      count: seedSeries.length,
      ids: seedSeries.map(s => s.id),
    },
    campaigns: {
      count: seedCampaigns.length,
      ids: seedCampaigns.map(c => c.id),
      totalPosts: seedCampaigns.reduce((sum, c) => sum + c.contentItems.length, 0),
    },
  };
}

// Export individual seed items for direct access
export { aerospaceSeriesSeed, AEROSPACE_SERIES_ID } from './aerospace-series';
export { aerospaceCampaignSeed, AEROSPACE_CAMPAIGN_ID } from './aerospace-campaign';
export { omnipostXCampaignSeed, OMNIPOST_X_CAMPAIGN_ID } from './omnipost-x-campaign';
