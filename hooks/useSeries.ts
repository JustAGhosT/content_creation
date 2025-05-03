import { useState, useEffect } from 'react';
import { Series } from '../types/series';

/**
 * Custom hook for managing series data with localStorage persistence
 */
export function useSeries() {
  const [series, setSeries] = useState<Series[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load series from localStorage on initial render
  useEffect(() => {
    try {
      setIsLoading(true);
      const savedSeries = localStorage.getItem('content-series');
      if (savedSeries) {
        setSeries(JSON.parse(savedSeries));
      }
    } catch (err) {
      console.error('Error loading series from localStorage:', err);
      setError('Failed to load saved series');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save series to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem('content-series', JSON.stringify(series));
      } catch (err) {
        console.error('Error saving series to localStorage:', err);
        setError('Failed to save series');
      }
    }
  }, [series, isLoading]);

  // Add a new series
  const addSeries = (newSeries: Series) => {
    setSeries(prevSeries => [...prevSeries, { ...newSeries, id: Date.now().toString() }]);
  };

  // Edit an existing series
  const editSeries = (index: number, updatedSeries: Series) => {
    setSeries(prevSeries => 
      prevSeries.map((s, i) => i === index ? updatedSeries : s)
    );
  };

  // Delete a series
  const deleteSeries = (index: number) => {
    setSeries(prevSeries => prevSeries.filter((_, i) => i !== index));
  };

  return {
    series,
    isLoading,
    error,
    addSeries,
    editSeries,
    deleteSeries,
  };
}