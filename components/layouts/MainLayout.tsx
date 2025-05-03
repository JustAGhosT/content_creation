import React, { ReactNode } from 'react';
import Head from 'next/head';
import Header from '../Header';
import Footer from '../Footer';
import styles from '../../styles/Layout.module.css';
import siteConfig from '../../content/siteConfig.json';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  ogImage?: string;
}

/**
 * Main shared layout component with consistent header and footer
 * To be used across all pages in the application
 */
const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  title,
  description,
  ogImage
}) => {
  const pageTitle = title 
    ? `${title} | ${siteConfig.siteName}`
    : siteConfig.siteName;
  
  const pageDescription = description || siteConfig.siteDescription;
  return (
    <div className={styles.layoutContainer}>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        {ogImage && <meta property="og:image" content={ogImage} />}
      </Head>
      
      <Header />
      <main className={styles.mainContent}>
        {children}
      </main>
      
      <Footer />
    </div>
  );
};

export default MainLayout;