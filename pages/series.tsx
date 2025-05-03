import React, { useState } from 'react';
import Link from 'next/link';
import Layout from '../components/layouts/Layout';
import SeriesForm from '../components/series/SeriesForm';
import SeriesCard from '../components/series/SeriesCard';
import EmptyState from '../components/series/EmptyState';
import { useSeries } from '../hooks/useSeries';
import styles from '../styles/Series.module.css';

/**
 * Series management page
 */
const SeriesPage: React.FC = () => {
  // Use our custom hook for series state management
  const { series, isLoading, error, addSeries, editSeries, deleteSeries } = useSeries();
  
  // State to control form visibility
  const [showForm, setShowForm] = useState<boolean>(false);
  
  // Toggle form visibility
  const toggleForm = () => {
    setShowForm(!showForm);
  };

  return (
    <Layout
      title="Manage Content Series"
      description="Create and manage your technical content series"
    >
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Manage Content Series</h1>
        <p className={styles.pageDescription}>
          Organize your technical content into structured series for better planning and distribution
        </p>
        
        {/* Error message if loading fails */}
        {error && <div className={styles.errorMessage}>{error}</div>}
        
        {/* Form toggle button */}
        {!showForm && series.length > 0 && (
          <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
            <button 
              onClick={toggleForm} 
              className={styles.primaryButton}
            >
              Create New Series
            </button>
          </div>
        )}
        
        {/* Series form */}
        {showForm && (
          <>
            <SeriesForm 
              onAddSeries={(newSeries) => {
                addSeries(newSeries);
                setShowForm(false);
              }} 
            />
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <button 
                onClick={toggleForm} 
                className={styles.secondaryButton}
              >
                Cancel
              </button>
            </div>
          </>
        )}
        
        {/* Series list or empty state */}
        {isLoading ? (
          <div className={styles.loadingState}>Loading your content series...</div>
        ) : series.length === 0 ? (
          <EmptyState onCreateClick={() => setShowForm(true)} />
        ) : (
          <div className={styles.seriesGrid}>
            {series.map((s, index) => (
              <SeriesCard
                key={s.id || index}
                series={s}
                index={index}
                onEdit={editSeries}
                onDelete={deleteSeries}
              />
            ))}
          </div>
        )}
        
        {/* Navigation links */}
        <div className={styles.navigationLinks}>
          <Link href="/workflow" className={styles.navLink}>
            ← View Content Workflow
          </Link>
          <Link href="/performance-dashboard" className={styles.navLink}>
            View Performance Dashboard →
          </Link>
        </div>
      </div>
    </Layout>
  );
};

// Add performance monitoring for Core Web Vitals
export function reportWebVitals(metric) {
  // In a real app, send to your analytics platform
  console.log(metric);
}

export default SeriesPage;