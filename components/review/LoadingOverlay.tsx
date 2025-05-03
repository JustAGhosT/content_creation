import React from 'react';
import Image from 'next/image';
import styles from '../../styles/HumanReview.module.css';
import { ReviewStep } from '../../hooks/useReviewProcess';

interface LoadingOverlayProps {
  currentStep: ReviewStep;
}

/**
 * Component for displaying a loading overlay during processing
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ currentStep }) => {
  return (
    <div className={styles.loadingOverlay}>
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
  );
};

export default LoadingOverlay;