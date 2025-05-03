import React from 'react';
import workflowStyles from '../../styles/workflow.module.css';

interface StepCardProps {
  title: string;
  items: string[];
  tip?: string;
}

const StepCard: React.FC<StepCardProps> = ({ title, items, tip }) => {
  return (
    <div className={workflowStyles['step-card']}>
      <h4>{title}</h4>
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
      {tip && (
        <div className={workflowStyles.tip}>
          <strong>Pro Tip:</strong> {tip}
        </div>
      )}
    </div>
  );
};

interface WorkflowStageProps {
  number: number;
  title: string;
  steps: StepCardProps[];
}

const WorkflowStage: React.FC<WorkflowStageProps> = ({ 
  number, 
  title, 
  steps 
}) => {
  return (
    <div className={workflowStyles['workflow-stage']}>
      <div className={workflowStyles['stage-header']}>
        <div className={workflowStyles['stage-number']}>{number}</div>
        <h3 className={workflowStyles['stage-title']}>{title}</h3>
      </div>
      <div className={workflowStyles['stage-steps']}>
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