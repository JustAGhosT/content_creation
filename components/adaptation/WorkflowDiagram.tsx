import React from 'react';
import WorkflowStage from './WorkflowStage';
import styles from '../../styles/ContentAdaptation.module.css';

interface WorkflowStep {
  title: string;
  items: string[];
  tip: string;
}

interface WorkflowStageData {
  stageNumber: number;
  stageTitle: string;
  steps: WorkflowStep[];
}

interface WorkflowDiagramProps {
  stages: WorkflowStageData[];
}

/**
 * Component for displaying the workflow diagram with multiple stages
 */
const WorkflowDiagram: React.FC<WorkflowDiagramProps> = ({ stages }) => {
  return (
    <div className={styles.workflow}>
      <div className={styles.workflowContainer}>
        <div className={styles.workflowDiagram}>
          {stages.map((stage, index) => (
            <WorkflowStage
              key={index}
              stageNumber={stage.stageNumber}
              stageTitle={stage.stageTitle}
              steps={stage.steps}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkflowDiagram;