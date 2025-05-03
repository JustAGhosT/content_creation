import React, { useState } from 'react';
import axios from 'axios';

interface TextParserProps {
  rawInput: string;
}

const TextParser: React.FC<TextParserProps> = ({ rawInput }) => {
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
      setParsedData(null);
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
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button onClick={parseText} disabled={isLoading}>Parse Text</button>
      <button onClick={analyzeText} disabled={isLoading}>Analyze Text</button>
      {error && <p>Error: {error}</p>}
      {parsedData && <pre>{JSON.stringify(parsedData, null, 2)}</pre>}
    </div>
  );
};

export default TextParser;
