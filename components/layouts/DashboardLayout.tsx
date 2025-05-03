import React, { ReactElement, ReactNode } from 'react';
import MainLayout from './MainLayout';
import styles from '../../styles/shared.module.css';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  ogImage?: string;
}

/**
 * Layout component specifically for dashboard pages
 * Uses the MainLayout for consistent header and footer
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  description,
  ogImage
}) => {
  return (
    <MainLayout title={title} description={description} ogImage={ogImage}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        <div className={styles.section}>
          {children}
        </div>
      </div>
    </MainLayout>
  );
};

// Helper function to create a getLayout function for dashboard pages
export const getDefaultDashboardLayout = (title: string, description?: string) => {
  return function getLayout(page: ReactElement): ReactElement {
    return (
      <DashboardLayout title={title} description={description}>
        {page}
      </DashboardLayout>
    );
  };
};

export default DashboardLayout;
