import React from 'react';
import dynamic from 'next/dynamic';
import styles from '../../styles/HumanReview.module.css';

// Dynamic import for the SummarizationAPI component
const SummarizationAPI = dynamic(() => import('../SummarizationAPI'), {
  loading: () => <p className={styles.loadingComponent}>Loading summarization tool...</p>,
  ssr: true,
});

interface SummarizationStageProps {
  parsedData: any;
  onBack: () => void;
  onNext: () => void;
  isDisabled: boolean;
}

/**
 * Component for the summarization stage of the review process
 */
const SummarizationStage: React.FC<SummarizationStageProps> = ({
  parsedData,
  onBack,
  onNext,
  isDisabled
}) => {
  return (
    <div className={styles.summaryStage}>
      <h2>Generated Summary</h2>
      <SummarizationAPI rawText={parsedData} />
      <div className={styles.actionButtons}>
        <button
          className={styles.secondaryButton}
          onClick={onBack}
          disabled={isDisabled}
        >
          Back
        </button>
        <button
          className={styles.primaryButton}
          onClick={onNext}
          disabled={isDisabled}
        >
          Generate Image
        </button>
      </div>
    </div>
  );
};

export default SummarizationStage;