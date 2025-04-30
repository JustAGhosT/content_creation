import React, { useState } from 'react';
import axios from 'axios';

const FeedbackMechanism = ({ reviewId }) => {
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const submitFeedback = async () => {
    try {
      const response = await axios.post('/api/submit-feedback', { reviewId, feedback });
      setSuccess('Feedback submitted successfully');
      setFeedback('');
    } catch (err) {
      setError('Failed to submit feedback');
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
      />
      <button onClick={submitFeedback}>Submit</button>
    </div>
  );
};

export default FeedbackMechanism;
