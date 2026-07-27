/**
 * Performance Dashboard Page (App Router)
 * Server Component with server-side data fetching
 */

import { Metadata } from 'next';
import styles from '@/styles/shared.module.css';
import dashboardStyles from '@/styles/dashboard.module.css';
import { DashboardMetrics } from './DashboardMetrics';

export const metadata: Metadata = {
  title: 'Performance Dashboard',
  description: 'Monitor and analyze your content performance across platforms',
};

export default function PerformanceDashboardPage() {
  return (
    <>
      <div className={dashboardStyles.dashboardHero}>
        <div>
          <p className={dashboardStyles.eyebrow}>Publishing intelligence</p>
          <h1>Performance Dashboard</h1>
          <p>Monitor engagement, integrations, and platform momentum from one workspace.</p>
        </div>
        <div className={dashboardStyles.heroMeta}>
          <span>0 platforms reporting</span>
          <span>No verified activity yet</span>
        </div>
      </div>

      <div className={dashboardStyles.summaryGrid} aria-label="Dashboard summary">
        <div className={dashboardStyles.summaryCard}>
          <span className={dashboardStyles.summaryLabel}>Total engagement</span>
          <strong aria-label="No verified engagement data">—</strong>
          <span className={dashboardStyles.summaryHint}>No provider telemetry is ingested</span>
        </div>
        <div className={dashboardStyles.summaryCard}>
          <span className={dashboardStyles.summaryLabel}>Top platform</span>
          <strong>None</strong>
          <span className={dashboardStyles.summaryHint}>Waiting for verified engagement</span>
        </div>
        <div className={dashboardStyles.summaryCard}>
          <span className={dashboardStyles.summaryLabel}>Data source</span>
          <strong>Not connected</strong>
          <span className={dashboardStyles.summaryHint}>
            Only verified provider data will appear
          </span>
        </div>
      </div>

      <div className={`${styles.section} ${dashboardStyles.dashboardSection}`}>
        <div className={dashboardStyles.dashboardGrid}>
          <DashboardMetrics />
        </div>
      </div>
    </>
  );
}
