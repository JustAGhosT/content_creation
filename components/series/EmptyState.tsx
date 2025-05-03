import React from 'react';
import Image from 'next/image';
import styles from '../../styles/Series.module.css';

interface EmptyStateProps {
  onCreateClick: () => void;
}

/**
 * Component displayed when no series exist
 */
const EmptyState: React.FC<EmptyStateProps> = ({ onCreateClick }) => {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyStateIcon}>
        <Image
          src="/images/empty-series.svg"
          alt="No series found"
          width={120}
          height={120}
          // Fallback if image doesn't exist
          onError={(e) => {
            // @ts-ignore
            e.target.style.display = 'none';
          }}
        />
      </div>
      <h3 className={styles.emptyStateTitle}>No Content Series Yet</h3>
      <p className={styles.emptyStateDescription}>
        Create your first content series to start organizing your technical articles.
      </p>
      <button 
        onClick={onCreateClick} 
        className={styles.primaryButton}
      >
        Create Your First Series
      </button>
    </div>
  );
};

export default EmptyState;