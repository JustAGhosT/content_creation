import React, { useState } from 'react';
import axios from 'axios';

const TextParser = ({ rawInput }) => {
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);

  const [isLoading, setIsLoading] = useState(false);

  const parseText = async () => {
    if (!rawInput || rawInput.trim() === '') {
      setError('Please provide text to parse');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/parse', { rawInput });
      setParsedData(response.data);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeText = async () => {
    if (!parsedData) {
      setError('Please parse text before analyzing');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/analyze', { parsedData });
      setParsedData(response.data);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button onClick={parseText}>Parse Text</button>
      <button onClick={analyzeText}>Analyze Text</button>
      {error && <p>Error: {error}</p>}
      {parsedData && <pre>{JSON.stringify(parsedData, null, 2)}</pre>}
    </div>
  );
};

export default TextParser;
