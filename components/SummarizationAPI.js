import React, { useState } from 'react';
import axios from 'axios';

const SummarizationAPI = ({ rawText }) => {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  const generateSummary = async () => {
    try {
      const response = await axios.post('/api/summarize', { rawText });
      setSummary(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const approveSummary = async () => {
    try {
      const response = await axios.post('/api/approve-summary', { summary });
      console.log('Summary approved:', response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <button onClick={generateSummary}>Generate Summary</button>
      {error && <p>Error: {error}</p>}
      {summary && (
        <div>
          <pre>{JSON.stringify(summary, null, 2)}</pre>
          <button onClick={approveSummary}>Approve Summary</button>
        </div>
      )}
    </div>
  );
};

export default SummarizationAPI;
