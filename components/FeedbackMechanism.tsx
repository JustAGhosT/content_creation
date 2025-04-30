import React, { useState } from 'react';
import axios from 'axios';

interface FeedbackMechanismProps {
  reviewId: string;
}

const FeedbackMechanism: React.FC<FeedbackMechanismProps> = ({ reviewId }) => {
  if (!reviewId) {
    console.warn('FeedbackMechanism: reviewId prop is missing or empty');
  }

  const [feedback, setFeedback] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const submitFeedback = async () => {
    if (!feedback.trim()) {
      setError('Feedback cannot be empty');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post('/api/submit-feedback', { reviewId, feedback });
      setSuccess('Feedback submitted successfully');
      setFeedback('');
      setLoading(false);
    } catch (err) {
      setError('Failed to submit feedback');
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Submit Feedback</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Enter your feedback here"
        disabled={loading}
      />
      <button onClick={submitFeedback} disabled={loading}>
        {loading ? 'Submitting...' : 'Submit'}
      </button>
    </div>
  );
};

export default FeedbackMechanism;
