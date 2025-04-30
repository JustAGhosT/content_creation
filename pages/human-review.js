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
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('input'); // 'input', 'parsing', 'summarizing', 'generating', 'approving'
  const handleRawInputChange = (e) => {
    setRawInput(e.target.value);
  };

  const handleParseText = async () => {
    setIsLoading(true);
    setCurrentStep('parsing');
    try {
      const response = await axios.post('/api/parse', { rawInput });
      setParsedData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
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
      {isLoading && <p>Loading... {currentStep}</p>}
      {currentStep === 'approved' && <p className="success">Content successfully approved!</p>}
      <div>
      <textarea
        value={rawInput}
        onChange={handleRawInputChange}
        placeholder="Enter raw input here"
        disabled={isLoading || currentStep === 'approved'}
      />
      <button
        onClick={handleParseText}
        disabled={isLoading || !rawInput || currentStep === 'approved'}
      >
        Parse Text
      </button>
      </div>
      {parsedData && (
      <div>
        <TextParser rawInput={rawInput} />
        <button
        onClick={handleGenerateSummary}
        disabled={isLoading || currentStep === 'approved'}
        >
        Generate Summary
        </button>
      </div>
      )}
      {summary && (
      <div>
        <SummarizationAPI rawText={parsedData} />
        <button
        onClick={handleGenerateImage}
        disabled={isLoading || currentStep === 'approved'}
        >
        Generate Image
        </button>
      </div>
      )}
      {image && (
      <div>
        <ImageGeneration context={summary} />
        <button
        onClick={handleApproveContent}
        disabled={isLoading || currentStep === 'approved'}
        >
        Approve Content
        </button>
      </div>
      )}
    </div>
    );
};

export default HumanReview;
