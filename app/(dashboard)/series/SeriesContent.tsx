'use client';

/**
 * Series Content Client Component
 * Handles interactive series management with form and CRUD operations
 */

import { useState } from 'react';
import Link from 'next/link';
import SeriesForm from '@/components/series/SeriesForm';
import SeriesCard from '@/components/series/SeriesCard';
import EmptyState from '@/components/series/EmptyState';
import { useSeries } from '@/hooks/useSeries';
import { useAuth } from '@/components/providers/AuthProvider';
import { Series } from '@/types/series';
import styles from '@/styles/Series.module.css';

export default function SeriesContent() {
  const { series, isLoading, error, addSeries, editSeries, deleteSeries } = useSeries();
  const { isAuthenticated } = useAuth();
  const [showForm, setShowForm] = useState<boolean>(false);

  const toggleForm = () => {
    setShowForm(!showForm);
  };

  const handleAddSeries = (newSeries: { title: string; description: string }) => {
    addSeries(newSeries as Series);
    setShowForm(false);
  };

  const handleDeleteSeries = (index: number) => {
    if (
      globalThis.confirm(
        'Are you sure you want to delete this series? This action cannot be undone.'
      )
    ) {
      deleteSeries(index);
    }
  };

  return (
    <>
      <div className={styles.container}>
        {/* Page Header */}
        <header className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Manage Content Series</h1>
          <p className={styles.pageDescription}>
            Organize your technical content into structured series for better planning and
            distribution
          </p>
        </header>

        {/* Error Message */}
        {error && <div className={styles.errorMessage}>{error}</div>}

        {/* Header Actions */}
        {!showForm && series.length > 0 && isAuthenticated && (
          <div className={styles.headerActions}>
            <button onClick={toggleForm} className={styles.primaryButton}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create New Series
            </button>
          </div>
        )}

        {/* Series Form */}
        {showForm && (
          <div className={styles.formContainer}>
            <h2 className={styles.formTitle}>Create New Series</h2>
            <SeriesForm onAddSeries={handleAddSeries} />
            <div className={styles.formActions}>
              <button onClick={toggleForm} className={styles.secondaryButton}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className={styles.loadingState}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ animation: 'spin 1s linear infinite', marginRight: '0.5rem' }}
            >
              <circle cx="12" cy="12" r="10" opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            Loading your content series...
          </div>
        )}

        {/* Empty State */}
        {!isLoading && series.length === 0 && !showForm && (
          <EmptyState onCreateClick={() => setShowForm(true)} />
        )}

        {/* Series Grid */}
        {!isLoading && series.length > 0 && (
          <div className={styles.seriesGrid}>
            {series.map((s: Series, index: number) => (
              <SeriesCard
                key={s.id || String(index)}
                series={s}
                index={index}
                onEdit={isAuthenticated ? editSeries : undefined}
                onDelete={isAuthenticated ? handleDeleteSeries : undefined}
              />
            ))}
          </div>
        )}

        {/* Navigation Links */}
        <nav className={styles.navigationLinks}>
          <Link href="/workflow" className={styles.navLink}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            View Content Workflow
          </Link>
          <Link href="/dashboard" className={styles.navLink}>
            View Performance Dashboard
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </nav>
      </div>
    </>
  );
}
