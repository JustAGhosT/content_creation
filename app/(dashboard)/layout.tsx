/**
 * Dashboard Layout
 * Layout for authenticated dashboard pages with error boundary protection
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import Header from '@/components/ui/Header';
import layoutStyles from '@/styles/MainLayout.module.css';
import styles from '@/styles/shared.module.css';

export default function DashboardLayout({ children }: { readonly children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <>
        <a href="#dashboard-main-content" className={layoutStyles.skipLink}>
          Skip to main content
        </a>
        <Header />
        <main id="dashboard-main-content" className={styles.container} tabIndex={-1}>
          <div>Loading...</div>
        </main>
      </>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <a href="#dashboard-main-content" className={layoutStyles.skipLink}>
        Skip to main content
      </a>
      <Header />
      <main id="dashboard-main-content" className={styles.container} tabIndex={-1}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </>
  );
}
