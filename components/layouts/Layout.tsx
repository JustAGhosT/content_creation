import React from 'react';
import Head from 'next/head';
import Header from '../Header';
import Footer from '../Footer';
import styles from '../../styles/Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  ogImage?: string;
}

/**
 * Shared layout component for consistent page structure
 */
const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title, 
  description,
  ogImage
}) => {
  return (
    <div className={styles.layoutContainer}>
      <Head>
        <title>{title} | Content Creation Platform</title>
        <meta name="description" content={description || title} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description || title} />
      </Head>
      
      <Header />
      
      <main className={styles.mainContent}>
        {children}
      </main>
      
      <Footer />
    </div>
  );
};

export default Layout;