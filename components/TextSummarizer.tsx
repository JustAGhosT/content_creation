import React, { useState } from 'react';
import { apiClient } from '../lib/api-client';

interface TextSummarizerProps {
  onSummarize?: (summary: string) => void;
}

const TextSummarizer: React.FC<TextSummarizerProps> = ({ onSummarize }) => {
  const [rawText, setRawText] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryApproved, setSummaryApproved] = useState<boolean>(false);

  // Handle text summarization
  const handleSummarize = async () => {
    if (!rawText.trim()) {
      setError('Please enter text to summarize');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSummaryApproved(false);
      
      // Use the API client to summarize text
      const result = await apiClient.summarizeText(rawText);
      
      if (result && result.summary) {
        setSummary(result.summary);
        
        // Call the callback if provided
        if (onSummarize) {
          onSummarize(result.summary);
        }
      } else {
        setError('Failed to generate summary: Invalid response format');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to summarize text');
      console.error('Error summarizing text:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle summary approval
  const handleApproveSummary = async () => {
    if (!summary) {
      setError('No summary to approve');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Use the API client to approve the summary
      await apiClient.approveSummary(summary);
      setSummaryApproved(true);
    } catch (err: any) {
      setError(err.message || 'Failed to approve summary');
      console.error('Error approving summary:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Text Summarizer</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {summaryApproved && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Summary approved successfully!
        </div>
      )}
      
      <div className="mb-4">
        <label htmlFor="rawText" className="block text-sm font-medium text-gray-700 mb-1">
          Text to Summarize
        </label>
        <textarea
          id="rawText"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          rows={8}
          placeholder="Enter text to summarize..."
          disabled={loading}
        />
      </div>
      
      <div className="mb-6">
        <button
          onClick={handleSummarize}
          disabled={loading || !rawText.trim()}
          className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            loading || !rawText.trim() ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Summarizing...' : 'Summarize Text'}
        </button>
      </div>
      
      {summary && (
        <div className="border rounded-md p-4">
          <h3 className="text-lg font-medium mb-2">Summary</h3>
          <p className="mb-4 whitespace-pre-wrap">{summary}</p>
          
          <button
            onClick={handleApproveSummary}
            disabled={loading || summaryApproved}
            className={`px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
              loading || summaryApproved ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {summaryApproved ? 'Approved' : loading ? 'Approving...' : 'Approve Summary'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TextSummarizer;