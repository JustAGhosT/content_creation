import React from 'react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import EngagementMetrics from '../components/dashboard/EngagementMetrics';
import AirtableIntegration from '../components/AirtableIntegration';
import { useEngagementMetrics } from '../hooks/useEngagementMetrics';
import dashboardStyles from '../styles/dashboard.module.css';

/**
 * Performance Dashboard page for monitoring content engagement metrics
 */
const PerformanceDashboard: React.FC = () => {
  // Use custom hook for data fetching with proper loading and error states
  const { data: metrics, isLoading, error, refetch } = useEngagementMetrics();

  return (
    <DashboardLayout 
      title="Performance Dashboard" 
      description="Monitor and analyze your content performance across platforms"
    >
      <div className={dashboardStyles.dashboardGrid}>
        {/* Engagement Metrics Card */}
        <EngagementMetrics 
          metrics={metrics}
          isLoading={isLoading}
          error={error}
          onRefresh={refetch}
        />
        
        {/* Airtable Integration Card */}
        <AirtableIntegration />
      </div>
    </DashboardLayout>
  );
};

// Add performance monitoring for Core Web Vitals
export function reportWebVitals(metric) {
  // In a real app, send to your analytics platform
  console.log(metric);
}

export default PerformanceDashboard;