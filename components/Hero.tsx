import React from 'react';
import Link from 'next/link';
import styles from '../styles/Hero.module.css';

const Hero: React.FC = () => {
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>Humanizing Technical Excellence</h1>
        <p className={styles.heroSubtitle}>
          Your journey to technical excellence starts here. Streamline your content creation workflow
          and maximize impact across platforms.
        </p>
        <div className={styles.heroCta}>
          <Link href="/series" className={`${styles.heroButton} ${styles.primaryButton}`}>
            Explore Series
          </Link>
          <Link href="/workflow" className={`${styles.heroButton} ${styles.secondaryButton}`}>
            View Workflow
          </Link>
        </div>
      </div>
      <div className={styles.heroFeatures}>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
          <h3>Content Workflow</h3>
          <p>Optimize your content creation process with our structured workflow methodology</p>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <h3>Platform Analysis</h3>
          <p>Understand audience engagement across different platforms to maximize your reach</p>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path>
            </svg>
          </div>
          <h3>Content Adaptation</h3>
          <p>Transform your content for different platforms while maintaining quality and consistency</p>
        </div>
      </div>
    </section>
  );
};

export default Hero;