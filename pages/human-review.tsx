import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image'; // Practice #2: Image optimization
import { useRouter } from 'next/router'; // Practice #3: Proper navigation
import Link from 'next/link'; // Practice #3: Proper navigation
import dynamic from 'next/dynamic'; // Practice #5: Code splitting
import axios from 'axios';
import Layout from '../components/Layout'; // Using the shared layout
import styles from '../styles/HumanReview.module.css'; // Extracted CSS
import reviewConfig from '../content/reviewConfig.json'; // Extracted JSON content

// Practice #5: Code splitting with dynamic imports
const TextParser = dynamic(() => import('../components/TextParser'), {
  loading: () => <p className={styles.loadingComponent}>Loading text parser...</p>,
  ssr: true,
});
const SummarizationAPI = dynamic(() => import('../components/SummarizationAPI'), {
  loading: () => <p className={styles.loadingComponent}>Loading summarization tool...</p>,
  ssr: true,
});
const ImageGeneration = dynamic(() => import('../components/ImageGeneration'), {
  loading: () => <p className={styles.loadingComponent}>Loading image generator...</p>,
  ssr: true,
});

interface ApiResponse {
  data: any;
  message?: string;
}

const HumanReview: React.FC = () => {
  const router = useRouter();
  const [rawInput, setRawInput] = useState<string>('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [image, setImage] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<'input' | 'parsing' | 'summarizing' | 'generating' | 'approving' | 'approved'>('input');
  
  // Practice #7: Handle query parameters for prefilling data
  useEffect(() => {
    if (router.query.initialInput) {
      setRawInput(router.query.initialInput as string);
    }
  }, [router.query]);

  const handleRawInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawInput(e.target.value);
  };

  // Practice #7: Proper data fetching with loading state
  const handleParseText = async () => {
    setIsLoading(true);
    setCurrentStep('parsing');
    try {
      const response = await axios.post<ApiResponse>('/api/parse', { rawInput });
      setParsedData(response.data);
      setCurrentStep('summarizing');
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
    setIsLoading(true);
    try {
      const response = await axios.post<ApiResponse>('/api/summarize', { rawText: parsedData });
      setSummary(response.data);
      setCurrentStep('generating');
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

  const handleGenerateImage = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post<ApiResponse>('/api/generate-image', { context: summary });
      setImage(response.data);
      setCurrentStep('approving');
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

  const handleApproveContent = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post<ApiResponse>('/api/approve-content', { summary, image });
      console.log('Content approved:', response.data);
      setCurrentStep('approved');
      
      // Practice #3: Proper navigation - redirect after successful approval
      setTimeout(() => {
        router.push('/performance-dashboard');
      }, 2000);
      
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

  // Practice #7: Reset functionality
  const handleReset = () => {
    setRawInput('');
    setParsedData(null);
    setSummary(null);
    setImage(null);
    setError(null);
    setCurrentStep('input');
  };

  return (
    <Layout 
      title="Human Review Interface" 
      description="Review and approve content before publication across platforms"
    >
      <div className={styles.reviewContainer}>
        <h1 className={styles.pageTitle}>Human Review Interface</h1>
        <p className={styles.pageDescription}>
          Review and approve content before publication across platforms
        </p>
        
        {error && <div className={styles.errorMessage}>Error: {error}</div>}
        
        {isLoading && (
          <div className={styles.loadingOverlay}>
            {/* Practice #2: Image optimization */}
            <div className={styles.loadingImageContainer}>
              <Image 
                src="/images/loading-spinner.svg"
                alt="Loading"
                width={50}
                height={50}
                priority
              />
            </div>
            <p>Processing: {currentStep}...</p>
          </div>
        )}
        
        {currentStep === 'approved' && (
          <div className={styles.successMessage}>
            <Image 
              src="/images/success-check.svg"
              alt="Success"
              width={30}
              height={30}
              priority
            />
            <p>Content successfully approved! Redirecting to dashboard...</p>
          </div>
        )}
        
        <div className={styles.workflowProgress}>
          {reviewConfig.steps.map((step, index) => (
            <div 
              key={index} 
              className={`${styles.progressStep} ${
                currentStep === step.id ? styles.activeStep : ''
              } ${
                reviewConfig.steps.findIndex(s => s.id === currentStep) > index ? styles.completedStep : ''
              }`}
            >
              <div className={styles.stepNumber}>{index + 1}</div>
              <div className={styles.stepLabel}>{step.label}</div>
            </div>
          ))}
        </div>
        
        <div className={styles.reviewStage}>
          {currentStep === 'input' && (
            <div className={styles.inputStage}>
              <h2>Input Raw Content</h2>
              <textarea
                className={styles.inputTextarea}
                value={rawInput}
                onChange={handleRawInputChange}
                placeholder="Enter raw input here"
                disabled={isLoading || currentStep === 'approved'}
              />
              <div className={styles.actionButtons}>
                <button
                  className={styles.primaryButton}
                  onClick={handleParseText}
                  disabled={isLoading || !rawInput || currentStep === 'approved'}
                >
                  Parse Text
                </button>
              </div>
            </div>
          )}
          
          {parsedData && currentStep === 'summarizing' && (
            <div className={styles.parsingStage}>
              <h2>Parsed Content</h2>
              <TextParser rawInput={rawInput} />
              <div className={styles.actionButtons}>
                <button
                  className={styles.secondaryButton}
                  onClick={handleReset}
                  disabled={isLoading}
                >
                  Start Over
                </button>
                <button
                  className={styles.primaryButton}
                  onClick={handleGenerateSummary}
                  disabled={isLoading}
                >
                  Generate Summary
                </button>
              </div>
            </div>
          )}
          
          {summary && currentStep === 'generating' && (
            <div className={styles.summaryStage}>
              <h2>Generated Summary</h2>
              <SummarizationAPI rawText={parsedData} />
              <div className={styles.actionButtons}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => setCurrentStep('summarizing')}
                  disabled={isLoading}
                >
                  Back
                </button>
                <button
                  className={styles.primaryButton}
                  onClick={handleGenerateImage}
                  disabled={isLoading}
                >
                  Generate Image
                </button>
              </div>
            </div>
          )}
          
          {image && currentStep === 'approving' && (
            <div className={styles.imageStage}>
              <h2>Generated Image</h2>
              <ImageGeneration context={summary} />
              <div className={styles.actionButtons}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => setCurrentStep('generating')}
                  disabled={isLoading}
                >
                  Back
                </button>
                <button
                  className={styles.primaryButton}
                  onClick={handleApproveContent}
                  disabled={isLoading}
                >
                  Approve Content
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Practice #3: Proper navigation */}
        <div className={styles.navigationLinks}>
          <Link href="/workflow" className={styles.navLink}>
            ← View Content Workflow
          </Link>
          <Link href="/performance-dashboard" className={styles.navLink}>
            View Performance Dashboard →
          </Link>
        </div>
      </div>
    </Layout>
  );
};

// Practice #7: Example of getServerSideProps for dynamic data
export async function getServerSideProps(context: any) {
  try {
    // This could fetch initial data based on query parameters
    // For now, we'll just pass through any query parameters
    return {
      props: {
        // Any server-side props would go here
      },
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      props: {
        error: 'Failed to load initial data',
      },
    };
  }
}

export default HumanReview;