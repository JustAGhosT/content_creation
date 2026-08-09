/**
 * Marketing Layout
 * Layout for public-facing marketing pages (landing, about, etc.)
 * Wrapped with ErrorBoundary to catch rendering errors gracefully
 */

'use client';

import { ErrorBoundary } from '@/components/ui';
import ScrollingHeader from '@/components/ui/ScrollingHeader';
import SharedFooter from '@/components/ui/SharedFooter';
import { useAnalytics } from '@/hooks/useAnalytics';
import styles from '@/styles/MarketingLayout.module.css';

export default function MarketingLayout({ children }: { readonly children: React.ReactNode }) {
  useAnalytics({ trackPageView: true });

  return (
    <div className={styles.layoutContainer}>
      <ScrollingHeader />
      <main className={styles.mainContent}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <SharedFooter />
    </div>
  );
}
