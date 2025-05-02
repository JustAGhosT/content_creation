import React, { useState, useEffect } from 'react';
import AirtableIntegration from '../components/AirtableIntegration';

interface EngagementMetric {
  platform: string;
  value: number | string;
}

const PerformanceDashboard: React.FC = () => {
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetric[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEngagementMetrics = async () => {
      try {
        const response = await fetch('/api/engagement-metrics');
        const data = await response.json();
        setEngagementMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
    };

    fetchEngagementMetrics();
  }, []);

  return (
    <div>
      <h2>Performance Dashboard</h2>
      {error && <p>Error: {error}</p>}
      <AirtableIntegration />
      <div>
        <h3>Engagement Metrics</h3>
        <ul>
          {engagementMetrics.map((metric, index) => (
            <li key={index}>
              <strong>{metric.platform}:</strong> {metric.value}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PerformanceDashboard;