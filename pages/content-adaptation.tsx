import React from 'react';
import { NextPage } from 'next';
import Layout from '../components/layouts/Layout';
import WorkflowDiagram from '../components/adaptation/WorkflowDiagram';
import AdaptationExamples from '../components/adaptation/AdaptationExamples';
import NavigationLinks from '../components/common/NavigationLinks';
import { workflowStages } from '../data/workflowStages';
import styles from '../styles/ContentAdaptation.module.css';

interface ContentAdaptationPageProps {
  adaptationExamples: any;
  error?: string;
}

/**
 * Content Adaptation page showing workflow stages and adaptation examples
 */
const ContentAdaptationPage: NextPage<ContentAdaptationPageProps> = ({ 
  adaptationExamples,
  error 
}) => {
  // Navigation links configuration
  const navigationLinks = [
    {
      href: '/workflow',
      label: 'View Complete Workflow',
      direction: 'prev' as const
    },
    {
      href: '/automation',
      label: 'Explore Automation Opportunities',
      direction: 'next' as const
    }
  ];

  return (
    <Layout
      title="Content Adaptation Strategies"
      description="Strategic approaches for adapting your technical content to different platforms while maintaining consistency and quality."
    >
      <div className={styles.container}>
        <div className={styles.section}>
          {/* Display error message if there was an error loading data */}
          {error && (
            <div className={styles.errorMessage}>
              <p>{error}</p>
            </div>
          )}
          
          {/* Workflow diagram section */}
          <WorkflowDiagram stages={workflowStages} />
          
          {/* Adaptation examples section */}
          <AdaptationExamples examples={adaptationExamples.examples} />
          
          {/* Navigation links */}
          <NavigationLinks 
            links={navigationLinks} 
            className={styles.navigationLinks} 
            linkClassName={styles.navLink} 
          />
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
    // For now, we'll import it directly
    const adaptationExamples = await import('../content/adaptationExamples.json');
    
    return {
      props: {
        adaptationExamples
      },
      // Revalidate every day
      revalidate: 86400,
    };
  } catch (error) {
    console.error('Error in getStaticProps:', error);
    return {
      props: {
        adaptationExamples: { examples: [] },
        error: 'Failed to load adaptation examples'
      },
    };
  }
}

// Add performance monitoring for Core Web Vitals
export function reportWebVitals(metric) {
  // In a real app, send to your analytics platform
  console.log(metric);
}

export default ContentAdaptationPage;