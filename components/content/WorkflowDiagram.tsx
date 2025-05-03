import React from 'react';
import WorkflowStage from './WorkflowStage';
import workflowStyles from '../../styles/workflow.module.css';

interface StepData {
  title: string;
  items: string[];
  tip?: string;
}

interface StageData {
  number: number;
  title: string;
  steps: StepData[];
}

interface WorkflowDiagramProps {
  stages: StageData[];
}

const WorkflowDiagram: React.FC<WorkflowDiagramProps> = ({ stages }) => {
  return (
    <div className={workflowStyles.workflow}>
      <div className={workflowStyles['workflow-container']}>
        <div className={workflowStyles['workflow-diagram']}>
          {stages.map((stage, index) => (
            <WorkflowStage
              key={index}
              number={stage.number}
              title={stage.title}
              steps={stage.steps}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkflowDiagram;