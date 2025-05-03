import React from 'react';
import Link from 'next/link';
import styles from '../styles/Footer.module.css';
import siteConfig from '../content/siteConfig.json';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerColumn}>
            <h3 className={styles.columnTitle}>Content Workflow Platform</h3>
            <p className={styles.footerDescription}>
              A comprehensive platform for content production workflow and platform analysis.
            </p>
          </div>
          
          <div className={styles.footerColumn}>
            <h3 className={styles.columnTitle}>Navigation</h3>
            <ul className={styles.footerLinks}>
              {siteConfig.navigation.map((item, index) => (
                <li key={index}>
                  <Link href={item.path} className={styles.footerLink}>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div className={styles.footerColumn}>
            <h3 className={styles.columnTitle}>Connect</h3>
            <ul className={styles.socialLinks}>
              {Object.entries(siteConfig.social).map(([platform, handle]) => (
                <li key={platform}>
                  <a 
                    href={`https://${platform}.com/${handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialLink}
                  >
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className={styles.footerBottom}>
          <p className={styles.copyright}>
            © {currentYear} {siteConfig.siteName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;