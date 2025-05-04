import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/Header.module.css';
import { useTheme } from '../context/ThemeContext';

const Header: React.FC = () => {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  
  // Helper function to determine if a link is active
  const isActive = (path: string) => {
    return router.pathname === path;
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        <div className={styles.logo}>
          <Link href="/">
            <span className={styles.logoText}>ContentFlow</span>
          </Link>
        </div>
        
        <nav className={styles.nav}>
          <ul className={styles.navList}>
            <li className={styles.navItem}>
              <Link 
                href="/" 
                className={`${styles.navLink} ${isActive('/') ? styles.active : ''}`}
              >
                Home
              </Link>
            </li>
            <li className={styles.navItem}>
              <Link 
                href="/series" 
                className={`${styles.navLink} ${isActive('/series') ? styles.active : ''}`}
              >
                Series
              </Link>
            </li>
            <li className={styles.navItem}>
              <Link 
                href="/workflow" 
                className={`${styles.navLink} ${isActive('/workflow') ? styles.active : ''}`}
              >
                Workflow
              </Link>
            </li>
            <li className={styles.navItem}>
              <Link 
                href="/platform-analysis" 
                className={`${styles.navLink} ${isActive('/platform-analysis') ? styles.active : ''}`}
              >
                Platform Analysis
              </Link>
            </li>
            <li className={styles.navItem}>
              <Link 
                href="/content-adaptation" 
                className={`${styles.navLink} ${isActive('/content-adaptation') ? styles.active : ''}`}
              >
                Content Adaptation
              </Link>
            </li>
            <li className={styles.navItem}>
              <Link 
                href="/automation" 
                className={`${styles.navLink} ${isActive('/automation') ? styles.active : ''}`}
              >
                Automation
              </Link>
            </li>
          </ul>
        </nav>
        
        <div className={styles.themeToggle}>
          <button 
            onClick={toggleTheme} 
            className={styles.themeButton}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;