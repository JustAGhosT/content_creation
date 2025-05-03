import React from 'react';
import type { ReactElement } from 'react';
import MainLayout from '../components/layouts/MainLayout';
import ContentHeader from '../components/content/ContentHeader';
import WorkflowDiagram from '../components/content/WorkflowDiagram';
import ContentAdaptation from '../components/content/ContentAdaptation';
import styles from '../styles/workflow.module.css';
import { NextPageWithLayout } from '../types';
import workflowData from '../content/workflowStages.json';
import adaptationExamples from '../content/adaptationExamples.json';

const WorkflowPage: NextPageWithLayout = () => {
  return (
    <div className={styles.container}>
      <ContentHeader 
        title="Humanizing Technical Excellence" 
        subtitle="Expanded Content Production Workflow & Platform Analysis" 
      />
      
      <div className={styles.section}>
        <h2>Comprehensive Content Production & Distribution Workflow</h2>
        <p>A detailed, step-by-step process for efficiently creating and distributing your technical content series across multiple platforms while maintaining quality and consistency.</p>
        
        <WorkflowDiagram stages={workflowData.stages} />
        
        <ContentAdaptation examples={adaptationExamples.examples} />
      </div>
    </div>
  );
};

WorkflowPage.getLayout = function getLayout(page: ReactElement): ReactElement {
  return (
    <MainLayout 
      title="Content Workflow"
      description="Visualize and manage your content creation process"
    >
      {page}
    </MainLayout>
  );
};

export default WorkflowPage;