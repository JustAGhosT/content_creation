'use client';

/**
 * Automation Content Client Component
 * Handles interactive tool selection and modal display
 */

import ToolGrid from '@/components/automation/ToolGrid';
import LoadingState from '@/components/ui/LoadingState';
import ErrorMessage from '@/components/ui/ErrorMessage';
import ToolDetailModal from '@/components/automation/ToolDetailModal';
import ConclusionSection from '@/components/automation/ConclusionSection';
import NavigationLinks from '@/components/ui/NavigationLinks';
import { useAutomationTools } from '@/hooks/useAutomationTools';
import { AutomationTool } from '@/types/automation';
import styles from '@/styles/Automation.module.css';

interface AutomationContentProps {
  readonly initialTools: AutomationTool[];
  readonly initialError: string | null;
}

export default function AutomationContent({ initialTools, initialError }: AutomationContentProps) {
  const { tools, selectedTool, isLoading, error, selectTool, closeTool } = useAutomationTools(
    initialTools,
    initialError
  );

  const navigationLinks = [
    {
      href: '/workflow',
      label: 'View Content Production Workflow',
      direction: 'prev' as const,
    },
    {
      href: '/platform-analysis',
      label: 'Explore Platform Analysis',
      direction: 'next' as const,
    },
  ];

  return (
    <>
      <div className={styles.container}>
        <div className={styles.section}>
          <div className={styles.automation}>
            <h2>Workflow Automation Opportunities</h2>
            <p>
              Leverage your system architecture expertise to automate repetitive tasks in your
              content workflow, improving efficiency and consistency.
            </p>

            {error ? <ErrorMessage message={error} /> : null}

            {isLoading ? <LoadingState /> : <ToolGrid tools={tools} onSelectTool={selectTool} />}

            {selectedTool ? <ToolDetailModal toolId={selectedTool} onClose={closeTool} /> : null}

            <ConclusionSection />

            <NavigationLinks
              links={navigationLinks}
              className={styles.navigationLinks}
              linkClassName={styles.navLink}
            />
          </div>
        </div>
      </div>
    </>
  );
}
