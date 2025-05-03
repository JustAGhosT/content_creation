import React from 'react';
import { NextPage } from 'next';
import Layout from '../components/layouts/Layout';
import ToolGrid from '../components/automation/ToolGrid';
import LoadingState from '../components/automation/LoadingState';
import ErrorMessage from '../components/automation/ErrorMessage';
import ToolDetailModal from '../components/automation/ToolDetailModal';
import ConclusionSection from '../components/automation/ConclusionSection';
import NavigationLinks from '../components/common/NavigationLinks';
import { useAutomationTools } from '../hooks/useAutomationTools';
import { AutomationTool } from '../types/automation';
import styles from '../styles/Automation.module.css';

interface AutomationPageProps {
  initialTools?: AutomationTool[];
  error?: string;
}

/**
 * Automation page showing workflow automation opportunities
 */
const AutomationPage: NextPage<AutomationPageProps> = ({ 
  initialTools = [], 
  error: initialError 
}) => {
  // Use our custom hook for managing automation tools
  const {
    tools,
    selectedTool,
    isLoading,
    error,
    selectTool,
    closeTool
  } = useAutomationTools(initialTools);

  // Navigation links configuration
  const navigationLinks = [
    {
      href: '/workflow',
      label: 'View Content Production Workflow',
      direction: 'prev' as const
    },
    {
      href: '/platform-analysis',
      label: 'Explore Platform Analysis',
      direction: 'next' as const
    }
  ];

  // Display error from props or from the hook
  const displayError = initialError || error;

  return (
    <Layout
      title="Workflow Automation"
      description="Leverage system architecture expertise to automate repetitive tasks in your content workflow, improving efficiency and consistency."
      ogImage="https://yoursite.com/images/og-automation.jpg"
    >
      <div className={styles.container}>
        <div className={styles.section}>
          <div className={styles.automation}>
            <h2>Workflow Automation Opportunities</h2>
            <p>
              Leverage your system architecture expertise to automate repetitive tasks in your content workflow, 
              improving efficiency and consistency.
            </p>
            
            {/* Error message */}
            {displayError && <ErrorMessage message={displayError} />}
            
            {/* Loading state or tool grid */}
            {isLoading ? (
              <LoadingState />
            ) : (
              <ToolGrid 
                tools={tools} 
                onSelectTool={selectTool} 
              />
            )}
            
            {/* Tool detail modal */}
            {selectedTool && (
              <ToolDetailModal 
                toolId={selectedTool} 
                onClose={closeTool} 
              />
            )}
            
            {/* Conclusion section */}
            <ConclusionSection />
            
            {/* Navigation links */}
            <NavigationLinks 
              links={navigationLinks} 
              className={styles.navigationLinks} 
              linkClassName={styles.navLink} 
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

/**
 * Static site generation with incremental static regeneration
 */
export async function getStaticProps() {
  try {
    // In a real implementation, you might fetch this data from an API or CMS
    const automationTools = await import('../content/automationTools.json');
    
    return {
      props: {
        initialTools: automationTools.tools
      },
      // Revalidate every hour
      revalidate: 3600,
    };
  } catch (error) {
    console.error('Error in getStaticProps:', error);
    return {
      props: {
        initialTools: [],
        error: 'Failed to load automation tools'
      },
    };
  }
}

// Add performance monitoring for Core Web Vitals
export function reportWebVitals(metric) {
  // In a real app, send to your analytics platform
  console.log(metric);
}

export default AutomationPage;