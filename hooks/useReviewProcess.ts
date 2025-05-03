import { useState } from 'react';
import axios from 'axios';

export type ReviewStep = 'input' | 'parsing' | 'summarizing' | 'generating' | 'approving' | 'approved';

interface ApiResponse {
  data: any;
  message?: string;
}

/**
 * Custom hook for managing the content review process
 */
export function useReviewProcess() {
  const [rawInput, setRawInput] = useState<string>('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [image, setImage] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<ReviewStep>('input');

  // Handle input change
  const handleRawInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawInput(e.target.value);
  };

  // Parse text
  const parseText = async () => {
    setIsLoading(true);
    setCurrentStep('parsing');
    try {
      const response = await axios.post<ApiResponse>('/api/parse', { rawInput });
      setParsedData(response.data);
      setCurrentStep('summarizing');
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate summary
  const generateSummary = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post<ApiResponse>('/api/summarize', { rawText: parsedData });
      setSummary(response.data);
      setCurrentStep('generating');
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate image
  const generateImage = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post<ApiResponse>('/api/generate-image', { context: summary });
      setImage(response.data);
      setCurrentStep('approving');
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Approve content
  const approveContent = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post<ApiResponse>('/api/approve-content', { summary, image });
      console.log('Content approved:', response.data);
      setCurrentStep('approved');
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset the process
  const resetProcess = () => {
    setRawInput('');
    setParsedData(null);
    setSummary(null);
    setImage(null);
    setError(null);
    setCurrentStep('input');
  };

  // Go back to previous step
  const goToPreviousStep = (step: ReviewStep) => {
    setCurrentStep(step);
  };

  // Set initial input (e.g., from URL params)
  const setInitialInput = (input: string) => {
    setRawInput(input);
  };

  // Error handling helper
  const handleError = (err: any) => {
    if (axios.isAxiosError(err)) {
      setError(err.response?.data?.message || err.message);
    } else if (err instanceof Error) {
      setError(err.message);
    } else {
      setError('An unknown error occurred');
    }
  };

  return {
    rawInput,
    parsedData,
    summary,
    image,
    error,
    isLoading,
    currentStep,
    handleRawInputChange,
    parseText,
    generateSummary,
    generateImage,
    approveContent,
    resetProcess,
    goToPreviousStep,
    setInitialInput
  };
}