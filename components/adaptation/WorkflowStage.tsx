import React from 'react';
import styles from '../../styles/ContentAdaptation.module.css';

interface StepCardProps {
  title: string;
  items: string[];
  tip: string;
}

/**
 * Component for displaying a step card in the workflow
 */
const StepCard: React.FC<StepCardProps> = ({ title, items, tip }) => {
  return (
    <div className={styles.stepCard}>
      <h4>{title}</h4>
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
      <div className={styles.tip}>
        <strong>Pro Tip:</strong> {tip}
      </div>
    </div>
  );
};

interface WorkflowStageProps {
  stageNumber: number;
  stageTitle: string;
  steps: StepCardProps[];
}

/**
 * Component for displaying a workflow stage with multiple steps
 */
const WorkflowStage: React.FC<WorkflowStageProps> = ({
  stageNumber,
  stageTitle,
  steps
}) => {
  return (
    <div className={styles.workflowStage}>
      <div className={styles.stageHeader}>
        <div className={styles.stageNumber}>{stageNumber}</div>
        <h3 className={styles.stageTitle}>{stageTitle}</h3>
      </div>
      <div className={styles.stageSteps}>
        {steps.map((step, index) => (
          <StepCard 
            key={index}
            title={step.title}
            items={step.items}
            tip={step.tip}
          />
        ))}
      </div>
    </div>
  );
};

export default WorkflowStage;