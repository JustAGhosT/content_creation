import React from 'react';
import styles from '../../styles/HumanReview.module.css';
import { ReviewStep } from '../../hooks/useReviewProcess';

interface Step {
  id: string;  // Changed from ReviewStep to string for more flexibility
  label: string;
}

interface ProgressBarProps {
  steps: Step[];
  currentStep: ReviewStep;
}

/**
 * Component for displaying the workflow progress
 */
const ProgressBar: React.FC<ProgressBarProps> = ({ steps, currentStep }) => {
  return (
    <div className={styles.workflowProgress}>
      {steps.map((step, index) => (
        <div 
          key={index} 
          className={`${styles.progressStep} ${
            currentStep === step.id ? styles.activeStep : ''
          } ${
            steps.findIndex(s => s.id === currentStep) > index ? styles.completedStep : ''
          }`}
        >
          <div className={styles.stepNumber}>{index + 1}</div>
          <div className={styles.stepLabel}>{step.label}</div>
        </div>
      ))}
    </div>
  );
};

export default ProgressBar;