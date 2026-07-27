/**
 * Content Adaptation Page - App Router
 * Shows workflow stages and adaptation examples with ISR
 */

import { Metadata } from 'next';
import WorkflowDiagram from '@/components/adaptation/WorkflowDiagram';
import AdaptationExamples from '@/components/adaptation/AdaptationExamples';
import NavigationLinks from '@/components/ui/NavigationLinks';
import { workflowStages } from '@/data/workflowStages';
import styles from '@/styles/ContentAdaptation.module.css';

export const metadata: Metadata = {
  title: 'Content Adaptation Strategies',
  description:
    'Strategic approaches for adapting your technical content to different platforms while maintaining consistency and quality.',
};

// ISR: Revalidate every day
export const revalidate = 86400;

async function getAdaptationExamples() {
  try {
    const adaptationExamplesModule = await import('@/data/adaptationExamples.json');
    return {
      examples: adaptationExamplesModule.default || adaptationExamplesModule,
      error: null,
    };
  } catch (error) {
    console.error('Error loading adaptation examples:', error);
    return { examples: { examples: [] }, error: 'Failed to load adaptation examples' };
  }
}

export default async function ContentAdaptationPage() {
  const { examples: adaptationExamples, error } = await getAdaptationExamples();

  const navigationLinks = [
    {
      href: '/workflow',
      label: 'View Complete Workflow',
      direction: 'prev' as const,
    },
    {
      href: '/automation',
      label: 'Explore Automation Opportunities',
      direction: 'next' as const,
    },
  ];

  return (
    <>
      <div className={styles.container}>
        <div className={styles.section}>
          {error ? (
            <div className={styles.errorContainer}>
              <h3 className={styles.errorTitle}>Something Went Wrong</h3>
              <p className={styles.errorMessage}>{error}</p>
              <p className={styles.errorSuggestion}>
                Please try refreshing the page or contact support if the problem persists.
              </p>
            </div>
          ) : null}

          <WorkflowDiagram stages={workflowStages} />

          <AdaptationExamples examples={adaptationExamples.examples} />

          <NavigationLinks
            links={navigationLinks}
            className={styles.navigationLinks}
            linkClassName={styles.navLink}
          />
        </div>
      </div>
    </>
  );
}
