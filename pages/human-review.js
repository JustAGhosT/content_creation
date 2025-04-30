import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TextParser from '../components/TextParser';
import SummarizationAPI from '../components/SummarizationAPI';
import ImageGeneration from '../components/ImageGeneration';

const HumanReview = () => {
  const [rawInput, setRawInput] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);

  const handleRawInputChange = (e) => {
    setRawInput(e.target.value);
  };

  const handleParseText = async () => {
    try {
      const response = await axios.post('/api/parse', { rawInput });
      setParsedData(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGenerateSummary = async () => {
    try {
      const response = await axios.post('/api/summarize', { rawText: parsedData });
      setSummary(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGenerateImage = async () => {
    try {
      const response = await axios.post('/api/generate-image', { context: summary });
      setImage(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleApproveContent = async () => {
    try {
      const response = await axios.post('/api/approve-content', { summary, image });
      console.log('Content approved:', response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>Human Review Interface</h2>
      {error && <p>Error: {error}</p>}
      <div>
        <textarea
          value={rawInput}
          onChange={handleRawInputChange}
          placeholder="Enter raw input here"
        />
        <button onClick={handleParseText}>Parse Text</button>
      </div>
      {parsedData && (
        <div>
          <TextParser rawInput={rawInput} />
          <button onClick={handleGenerateSummary}>Generate Summary</button>
        </div>
      )}
      {summary && (
        <div>
          <SummarizationAPI rawText={parsedData} />
          <button onClick={handleGenerateImage}>Generate Image</button>
        </div>
      )}
      {image && (
        <div>
          <ImageGeneration context={summary} />
          <button onClick={handleApproveContent}>Approve Content</button>
        </div>
      )}
    </div>
  );
};

export default HumanReview;
