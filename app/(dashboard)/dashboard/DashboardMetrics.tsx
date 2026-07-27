import dashboardStyles from '@/styles/dashboard.module.css';

export function DashboardMetrics() {
  return (
    <div className={dashboardStyles.metricsCard}>
      <div className={dashboardStyles.cardHeader}>
        <span className={dashboardStyles.cardKicker}>Analytics</span>
        <h2>Engagement Metrics</h2>
        <p>Verified provider engagement will appear here when ingestion is available.</p>
      </div>
      <div className={dashboardStyles.cardContent}>
        <div className={dashboardStyles.emptyMessage} role="status">
          <div>
            <strong>No verified engagement data yet</strong>
            <p>
              OmniPost will not estimate or display sample performance. Connect a supported platform
              and publish content; verified metrics will appear when provider telemetry is
              available.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
