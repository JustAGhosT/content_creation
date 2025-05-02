import React, { useState } from 'react';
import { apiClient } from '../lib/api-client';

interface FeedbackFormProps {
  reviewId: string;
  onSubmitSuccess?: () => void;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ reviewId, onSubmitSuccess }) => {
  const [feedback, setFeedback] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Handle feedback submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedback.trim()) {
      setError('Please enter your feedback');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      // Use the API client to submit feedback
      await apiClient.submitFeedback(reviewId, feedback);
      
      // Show success message and reset form
      setSuccess(true);
      setFeedback('');
      
      // Call the success callback if provided
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback');
      console.error('Error submitting feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 border rounded-lg">
      <h2 className="text-xl font-bold mb-4">Submit Feedback</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Thank you for your feedback!
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-1">
            Your Feedback
          </label>
          <textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder="Please share your thoughts..."
            disabled={loading}
          />
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            Review ID: <span className="font-mono">{reviewId}</span>
          </p>
        </div>
        
        <button
          type="submit"
          disabled={loading || !feedback.trim()}
          className={`w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            loading || !feedback.trim() ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
};

export default FeedbackForm;