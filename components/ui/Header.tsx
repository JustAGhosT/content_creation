'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from '@/styles/Header.module.css';
import { NavigationItem, siteConfig } from '../../data/siteConfig';
import { useAuth } from '../providers/AuthProvider';
import ProductStatus from './ProductStatus';

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'omnipost.theme';
const Header: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const isNavItemActive = (item: NavigationItem): boolean => {
    if (pathname === item.path) return true;
    return item.children?.some(child => pathname === child.path) ?? false;
  };

  const toggleTheme = () => {
    const nextTheme = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const preferredTheme =
      storedTheme === 'dark' || storedTheme === 'light'
        ? storedTheme
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';

    setThemeMode(preferredTheme);
    document.documentElement.dataset.theme = preferredTheme;
  }, []);

  // Handle escape key to close menu
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menuOpen) {
        closeMenu();
      }
    };

    if (menuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus the first link in the menu when opened
      const firstLink = menuRef.current?.querySelector('a');
      firstLink?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen, closeMenu]);

  // Get navigation items (already validated by siteConfig)
  const navigationItems = siteConfig.navigation;

  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        <div className={styles.logoContainer}>
          <Link href="/" className={styles.logoLink}>
            <span className={styles.logoText}>{siteConfig.siteName || 'Site'}</span>
          </Link>
        </div>

        <button
          ref={menuButtonRef}
          className={styles.mobileMenuButton}
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
        >
          <span className={styles.menuIcon}></span>
          <span className={styles.menuIcon}></span>
          <span className={styles.menuIcon}></span>
        </button>

        <nav
          ref={menuRef}
          id="main-navigation"
          className={`${styles.navigation} ${menuOpen ? styles.menuOpen : ''}`}
        >
          <ul className={styles.navList}>
            {navigationItems.map(item => (
              <li
                key={`nav-${item.path}`}
                className={`${styles.navItem} ${item.children ? styles.hasDropdown : ''}`}
              >
                {item.children ? (
                  <>
                    <Link
                      href={item.path}
                      className={`${styles.navLink} ${styles.dropdownTrigger} ${
                        isNavItemActive(item) ? styles.activeLink : ''
                      }`}
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.name}
                      <span className={styles.dropdownChevron} aria-hidden="true">
                        v
                      </span>
                    </Link>
                    <ul className={styles.dropdownMenu} aria-label={`${item.name} navigation`}>
                      {item.children.map(child => (
                        <li key={`nav-${item.path}-${child.path}`}>
                          <Link
                            href={child.path}
                            className={`${styles.dropdownLink} ${
                              pathname === child.path ? styles.activeDropdownLink : ''
                            }`}
                            onClick={() => setMenuOpen(false)}
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <Link
                    href={item.path}
                    className={`${styles.navLink} ${pathname === item.path ? styles.activeLink : ''}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            ))}
            <li className={`${styles.navItem} ${styles.utilityGroup}`} aria-label="Header controls">
              {isAuthenticated && <ProductStatus variant="header" />}
              <button
                type="button"
                className={styles.iconToggleButton}
                onClick={toggleTheme}
                aria-label={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
                title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
              >
                {themeMode === 'dark' ? 'Light' : 'Dark'}
              </button>
              {isAuthenticated ? (
                <button onClick={handleLogout} className={styles.authButton}>
                  Logout ({user?.username})
                </button>
              ) : (
                <Link
                  href="/login"
                  className={`${styles.navLink} ${styles.loginLink}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
              )}
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
