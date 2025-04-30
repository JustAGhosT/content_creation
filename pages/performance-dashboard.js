import React, { useState, useEffect } from 'react';
import AirtableIntegration from '../components/AirtableIntegration';

const PerformanceDashboard = () => {
  const [engagementMetrics, setEngagementMetrics] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEngagementMetrics = async () => {
      try {
        const response = await fetch('/api/engagement-metrics');
        const data = await response.json();
        setEngagementMetrics(data);
      } catch (err) {
        setError(err.message);
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
