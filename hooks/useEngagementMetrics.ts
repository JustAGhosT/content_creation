import { useState, useEffect } from 'react';

export interface EngagementMetric {
  platform: string;
  value: number | string;
}

interface UseEngagementMetricsReturn {
  data: EngagementMetric[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching engagement metrics with loading and error states
 */
export function useEngagementMetrics(): UseEngagementMetricsReturn {
  const [data, setData] = useState<EngagementMetric[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEngagementMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/engagement-metrics');
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEngagementMetrics();
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch: fetchEngagementMetrics
  };
}