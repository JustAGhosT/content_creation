import React from 'react';
import Image from 'next/image';
import styles from '../../styles/Automation.module.css';

interface LoadingStateProps {
  message?: string;
}

/**
 * Component for displaying a loading state
 */
const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading automation tools...' 
}) => {
  return (
    <div className={styles.loading}>
      <div className={styles.loadingImageContainer}>
        <Image
          src="/images/loading-spinner.svg"
          alt="Loading"
          width={50}
          height={50}
          priority
        />
      </div>
      <p>{message}</p>
    </div>
  );
};

export default LoadingState;