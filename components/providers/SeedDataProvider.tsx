/**
 * Seed Data Provider
 * Loads seed data into localStorage on first app load
 */

'use client';

import { useEffect } from 'react';
import { loadAllSeedData, getSeedStats } from '@/lib/seed';

interface SeedDataProviderProps {
  readonly children: React.ReactNode;
}

export function SeedDataProvider({ children }: SeedDataProviderProps) {
  useEffect(() => {
    // Only run in browser
    if (globalThis.window === undefined) {
      return;
    }

    // Reconcile seed IDs on every app load so newly shipped campaigns are
    // backfilled without overwriting existing user data.
    try {
      const result = loadAllSeedData();
      const stats = getSeedStats();
      console.warn('[SeedDataProvider] Reconciled seed data:', {
        series: result.series.length,
        campaigns: result.campaigns.length,
        totalPosts: stats.campaigns.totalPosts,
      });
    } catch (error) {
      // Log but do not throw - seed data is non-critical and should not
      // crash the app shell. The app can function without seed data.
      console.error('[SeedDataProvider] Failed to load seed data:', error);
    }
  }, []);

  // Render children immediately - seed data loading is non-blocking
  return <>{children}</>;
}

export default SeedDataProvider;
