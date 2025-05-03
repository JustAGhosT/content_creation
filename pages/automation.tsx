import React from 'react';
import type { ReactElement } from 'react';
import MainLayout from '../components/layouts/MainLayout';
import ToolGrid from '../components/automation/ToolGrid';
import styles from '../styles/Automation.module.css';
import { NextPageWithLayout } from '../types';
import automationToolsData from '../content/automationTools.json';

const AutomationPage: NextPageWithLayout = () => {
  const handleSelectTool = (id: string) => {
    console.log(`Selected tool: ${id}`);
    // In a real app, this would open a detail view or modal
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Content Automation Tools</h1>
      <p className={styles.description}>
        Explore tools to automate and enhance your content creation process
      </p>
            
      <ToolGrid 
        tools={automationToolsData.tools} 
        onSelectTool={handleSelectTool} 
      />
    </div>
  );
};

AutomationPage.getLayout = function getLayout(page: ReactElement): ReactElement {
  return (
    <MainLayout 
      title="Content Automation"
      description="Tools to automate and enhance your content creation"
    >
      {page}
    </MainLayout>
  );
};

export default AutomationPage;