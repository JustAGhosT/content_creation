import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/layouts/Layout';
import ProgressBar from '../components/review/ProgressBar';
import InputStage from '../components/review/InputStage';
import ParsingStage from '../components/review/ParsingStage';
import SummarizationStage from '../components/review/SummarizationStage';
import ImageGenerationStage from '../components/review/ImageGenerationStage';
import LoadingOverlay from '../components/review/LoadingOverlay';
import SuccessMessage from '../components/review/SuccessMessage';
import ErrorMessage from '../components/review/ErrorMessage';
import { useReviewProcess } from '../hooks/useReviewProcess';
import styles from '../styles/HumanReview.module.css';
import reviewConfig from '../content/reviewConfig.json';

/**
 * Human Review Interface page for content review and approval
 */
const HumanReview: React.FC = () => {
  const router = useRouter();
  const {
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
  } = useReviewProcess();

  // Handle initial input from URL parameters
  useEffect(() => {
    if (router.query.initialInput) {
      setInitialInput(router.query.initialInput as string);
    }
  }, [router.query, setInitialInput]);

  // Redirect after successful approval
  useEffect(() => {
    if (currentStep === 'approved') {
      const redirectTimer = setTimeout(() => {
        router.push('/performance-dashboard');
      }, 2000);

      return () => clearTimeout(redirectTimer);
    }
  }, [currentStep, router]);

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
        
        {/* Error message */}
        {error && <ErrorMessage message={error} />}
        
        {/* Loading overlay */}
        {isLoading && <LoadingOverlay currentStep={currentStep} />}
        
        {/* Success message */}
        {currentStep === 'approved' && (
          <SuccessMessage message="Content successfully approved! Redirecting to dashboard..." />
        )}
        
        {/* Progress bar */}
        <ProgressBar 
          steps={reviewConfig.steps} 
          currentStep={currentStep} 
        />
        
        {/* Review stages */}
        <div className={styles.reviewStage}>
          {/* Input stage */}
          {currentStep === 'input' && (
            <InputStage
              rawInput={rawInput}
              onChange={handleRawInputChange}
              onSubmit={parseText}
              isDisabled={isLoading || currentStep === 'approved'}
            />
          )}
          
          {/* Parsing stage */}
          {parsedData && currentStep === 'summarizing' && (
            <ParsingStage
              rawInput={rawInput}
              onReset={resetProcess}
              onNext={generateSummary}
              isDisabled={isLoading}
            />
          )}
          
          {/* Summarization stage */}
          {summary && currentStep === 'generating' && (
            <SummarizationStage
              parsedData={parsedData}
              onBack={() => goToPreviousStep('summarizing')}
              onNext={generateImage}
              isDisabled={isLoading}
            />
          )}
          
          {/* Image generation stage */}
          {image && currentStep === 'approving' && (
            <ImageGenerationStage
              summary={summary}
              onBack={() => goToPreviousStep('generating')}
              onNext={approveContent}
              isDisabled={isLoading}
            />
          )}
        </div>
        
        {/* Navigation links */}
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

/**
 * Server-side props for initial data loading
 */
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

// Add performance monitoring for Core Web Vitals
export function reportWebVitals(metric) {
  // In a real app, send to your analytics platform
  console.log(metric);
}

export default HumanReview;