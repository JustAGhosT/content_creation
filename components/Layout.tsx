import React, { ReactNode } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from './Header';
import Footer from './Footer';
import styles from '../styles/Layout.module.css';
import siteConfig from '../content/siteConfig.json';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  ogImage?: string;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title = 'Content Workflow Platform',
  description = 'A comprehensive platform for content production workflow and platform analysis',
  ogImage = '/images/og-default.jpg'
}) => {
  const router = useRouter();
  
  // Construct full page title with site name
  const pageTitle = title ? `${title} | ${siteConfig.siteName}` : siteConfig.siteName;
  
  // Use provided description or fall back to site description
  const pageDescription = description || siteConfig.siteDescription;
  
  // Construct absolute URL for canonical and OG tags
  const canonicalUrl = `${siteConfig.siteUrl}${router.asPath}`;
  return (
    <div className={styles.layoutContainer}>
      <Head>
        <title>{pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={ogImage.startsWith('http') ? ogImage : `${siteConfig.siteUrl}${ogImage}`} />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="icon" href="/favicon.ico" />
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