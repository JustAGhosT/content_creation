import React from 'react';
import Head from 'next/head';
import styles from '../../styles/shared.module.css';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

/**
 * Layout component specifically for dashboard pages
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  description
}) => {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description || title} />
      </Head>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        <div className={styles.section}>
          {children}
        </div>
      </div>
    </>
  );
};

export default DashboardLayout;