import React from 'react';
import styles from '../../styles/shared.module.css';
import dashboardStyles from '../../styles/dashboard.module.css';

interface MetricsCardProps {
  title: string;
  children: React.ReactNode;
  isLoading?: boolean;
}

/**
 * A card component for displaying metrics in the dashboard
 */
const MetricsCard: React.FC<MetricsCardProps> = ({ 
  title, 
  children, 
  isLoading = false 
}) => {
  return (
    <div className={styles.card}>
      <h3>{title}</h3>
      {isLoading ? (
        <div className={dashboardStyles.loadingIndicator}>Loading...</div>
      ) : (
        children
      )}
    </div>
  );
};

export default MetricsCard;