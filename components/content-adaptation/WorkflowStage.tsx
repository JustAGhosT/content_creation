import React from 'react';

interface StepCardProps {
  title: string;
  steps: string[];
  tip: string;
}

const StepCard: React.FC<StepCardProps> = ({ title, steps, tip }) => {
  return (
    <div className="step-card">
      <h4>{title}</h4>
      <ul>
        {steps.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ul>
      <div className="tip">
        <strong>Pro Tip:</strong> {tip}
      </div>
    </div>
  );
};

interface WorkflowStageProps {
  stageNumber: number;
  stageTitle: string;
  steps: {
    title: string;
    steps: string[];
    tip: string;
  }[];
}

const WorkflowStage: React.FC<WorkflowStageProps> = ({ stageNumber, stageTitle, steps }) => {
  return (
    <div className="workflow-stage">
      <div className="stage-header">
        <div className="stage-number">{stageNumber}</div>
        <h3 className="stage-title">{stageTitle}</h3>
      </div>
      <div className="stage-steps">
        {steps.map((step, index) => (
          <StepCard 
            key={index} 
            title={step.title} 
            steps={step.steps} 
            tip={step.tip} 
          />
        ))}
      </div>
    </div>
  );
};

export default WorkflowStage;