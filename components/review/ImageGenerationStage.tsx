import React from 'react';
import dynamic from 'next/dynamic';
import styles from '../../styles/HumanReview.module.css';

// Dynamic import for the ImageGeneration component
const ImageGeneration = dynamic(() => import('../ImageGeneration'), {
  loading: () => <p className={styles.loadingComponent}>Loading image generator...</p>,
  ssr: true,
});

interface ImageGenerationStageProps {
  summary: any;
  onBack: () => void;
  onNext: () => void;
  isDisabled: boolean;
}

/**
 * Component for the image generation stage of the review process
 */
const ImageGenerationStage: React.FC<ImageGenerationStageProps> = ({
  summary,
  onBack,
  onNext,
  isDisabled
}) => {
  return (
    <div className={styles.imageStage}>
      <h2>Generated Image</h2>
      <ImageGeneration context={summary} />
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
          Approve Content
        </button>
      </div>
    </div>
  );
};

export default ImageGenerationStage;