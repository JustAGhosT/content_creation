import React, { useState } from 'react';
import axios from 'axios';

const TextParser = ({ rawInput }) => {
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);

  const parseText = async () => {
    try {
      const response = await axios.post('/api/parse', { rawInput });
      setParsedData(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const analyzeText = async () => {
    try {
      const response = await axios.post('/api/analyze', { parsedData });
      setParsedData(response.data);
    } catch (err) {
      setError(err.message);
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
