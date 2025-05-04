import React from 'react';
import Link from 'next/link';
import styles from '../styles/Footer.module.css';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div className={styles.footerSection}>
          <h3 className={styles.footerHeading}>Content Workflow Platform</h3>
          <p className={styles.footerDescription}>
            A comprehensive platform for content production workflow
            and platform analysis.
          </p>
        </div>
        
        <div className={styles.footerSection}>
          <h3 className={styles.footerHeading}>Navigation</h3>
          <ul className={styles.footerLinks}>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/workflow">Workflow</Link></li>
            <li><Link href="/automation">Automation</Link></li>
            <li><Link href="/content-adaptation">Content Adaptation</Link></li>
            <li><Link href="/platform-analysis">Platform Analysis</Link></li>
            <li><Link href="/series">Series</Link></li>
            <li><Link href="/dashboard">Dashboard</Link></li>
          </ul>
        </div>
        
        <div className={styles.footerSection}>
          <h3 className={styles.footerHeading}>Connect</h3>
          <ul className={styles.footerLinks}>
            <li>
              <a href="https://twitter.com/phoenixvc" target="_blank" rel="noopener noreferrer">
                Twitter
              </a>
            </li>
            <li>
              <a href="https://github.com/phoenixvc" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </li>
            <li>
              <a href="https://linkedin.com/company/phoenixvc" target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>
            </li>
          </ul>
        </div>
      </div>
      
      <div className={styles.footerBottom}>
        <p>© {currentYear} PhoenixVC Content Creation. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;