import React from 'react';
import { NextPage } from 'next';
import Layout from '../components/layouts/Layout';
import WorkflowDiagram from '../components/adaptation/WorkflowDiagram';
import AdaptationExamples from '../components/adaptation/AdaptationExamples';
import NavigationLinks from '../components/common/NavigationLinks';
import { workflowStages } from '../data/workflowStages';
import styles from '../styles/ContentAdaptation.module.css';
import adaptationExamplesData from '../content/adaptationExamples.json';

interface ContentAdaptationPageProps {
  adaptationExamples: {
    examples: Array<{
      platform: string;
      title: string;
      original: string;
      adaptation: string;
      notes: string[];
      image: string;
    }>;
  };
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
    // Instead of importing the module directly, we use the already imported data
    // This avoids the "[object Module]" serialization error
    return {
      props: {
        adaptationExamples: {
          examples: adaptationExamplesData.examples
        }
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