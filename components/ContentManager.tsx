import React, { useState, useEffect } from 'react';
import { apiClient } from '../lib/api-client';

interface ContentItem {
  id: string;
  Content: string;
  createdTime?: string;
}

interface ContentManagerProps {
  initialPageSize?: number;
}

const ContentManager: React.FC<ContentManagerProps> = ({ initialPageSize = 10 }) => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [filter, setFilter] = useState<string>('');
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [newContent, setNewContent] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Fetch content using the API client
  const fetchContent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the API client to track content
      const result = await apiClient.trackContent(page, pageSize, filter);
      
      if (result && result.data) {
        setContent(result.data);
        setHasMore(result.pagination?.hasMorePages || false);
      } else {
        setError('Invalid response format');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load content');
      console.error('Error fetching content:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load content on initial render and when dependencies change
  useEffect(() => {
    fetchContent();
  }, [page, pageSize, filter]);

  // Handle content submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newContent.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      // Use the API client to store content
      await apiClient.storeContent(newContent);
      
      // Reset form and refresh content list
      setNewContent('');
      setPage(1);
      fetchContent();
    } catch (err: any) {
      setError(err.message || 'Failed to submit content');
      console.error('Error submitting content:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
    setPage(1); // Reset to first page when filter changes
  };

  // Handle pagination
  const nextPage = () => {
    if (hasMore) {
      setPage(page + 1);
    }
  };

  const prevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Content Manager</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Content submission form */}
      <div className="mb-8 p-4 border rounded-lg">
        <h3 className="text-lg font-medium mb-4">Add New Content</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              placeholder="Enter content..."
              disabled={submitting}
            />
          </div>
          
          <button
            type="submit"
            disabled={submitting || !newContent.trim()}
            className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              submitting || !newContent.trim() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {submitting ? 'Submitting...' : 'Submit Content'}
          </button>
        </form>
      </div>
      
      {/* Content filter */}
      <div className="mb-4">
        <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-1">
          Filter Content
        </label>
        <input
          id="filter"
          type="text"
          value={filter}
          onChange={handleFilterChange}
          className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Filter by keyword..."
          disabled={loading}
        />
      </div>
      
      {/* Content list */}
      {loading ? (
        <div className="text-center p-8">Loading content...</div>
      ) : content.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          No content found. {filter && 'Try adjusting your filter.'}
        </div>
      ) : (
        <div>
          <div className="space-y-4">
            {content.map((item) => (
              <div key={item.id} className="p-4 border rounded-lg">
                <p className="whitespace-pre-wrap">{item.Content}</p>
                {item.createdTime && (
                  <p className="text-sm text-gray-500 mt-2">
                    Created: {new Date(item.createdTime).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
          
          {/* Pagination controls */}
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={prevPage}
              disabled={page === 1 || loading}
              className={`px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 ${
                page === 1 || loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Previous
            </button>
            
            <span>Page {page}</span>
            
            <button
              onClick={nextPage}
              disabled={!hasMore || loading}
              className={`px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 ${
                !hasMore || loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentManager;