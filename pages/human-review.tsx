import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TextParser from '../components/TextParser';
import SummarizationAPI from '../components/SummarizationAPI';
import ImageGeneration from '../components/ImageGeneration';

interface ApiResponse {
  data: any;
  message?: string;
}

const HumanReview: React.FC = () => {
  const [rawInput, setRawInput] = useState<string>('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [image, setImage] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<'input' | 'parsing' | 'summarizing' | 'generating' | 'approving' | 'approved'>('input');
  
  const handleRawInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawInput(e.target.value);
  };

  const handleParseText = async () => {
    setIsLoading(true);
    setCurrentStep('parsing');
    try {
      const response = await axios.post<ApiResponse>('/api/parse', { rawInput });
      setParsedData(response.data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    try {
      const response = await axios.post<ApiResponse>('/api/summarize', { rawText: parsedData });
      setSummary(response.data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  const handleGenerateImage = async () => {
    try {
      const response = await axios.post<ApiResponse>('/api/generate-image', { context: summary });
      setImage(response.data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  const handleApproveContent = async () => {
    try {
      const response = await axios.post<ApiResponse>('/api/approve-content', { summary, image });
      console.log('Content approved:', response.data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
      setCurrentStep('approved');
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