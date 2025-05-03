import '../styles/globals.css';
import { useRouter } from 'next/router';
import Head from 'next/head';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import styles from '../styles/App.module.css';
import siteConfig from '../content/siteConfig.json';
import { ReactElement, ReactNode } from 'react';
import type { NextPage } from 'next';
import MainLayout from '../components/layouts/MainLayout';

// Define types for pages with layouts
type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

// Practice #5: Code splitting with dynamic imports
const Analytics = dynamic(() => import('../components/Analytics'), {
  ssr: false,
  loading: () => <div className={styles.analyticsPlaceholder}>Loading analytics...</div>,
});

// Font optimization using Next.js font system
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function MyApp({ Component, pageProps }: AppPropsWithLayout) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Practice #7: Proper data fetching with loading state
  useEffect(() => {
    const handleStart = () => setIsLoading(true);
    const handleComplete = () => setIsLoading(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  // Use the layout defined at the page level, or fallback to MainLayout
  const getLayout = Component.getLayout || ((page) => (
    <MainLayout 
      title={pageProps.title || ''}
      description={pageProps.description || ''}
    >
      {page}
    </MainLayout>
  ));
  return (
    <>
      <div className={`${inter.variable} ${styles.appContainer} font-sans`}>
        {isLoading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingImageContainer}>
              <Image 
                src="/images/loading-spinner.svg"
                alt="Loading"
                width={50}
                height={50}
                priority
              />
            </div>
          </div>
        )}
        {getLayout(<Component {...pageProps} />)}
        {/* Practice #5: Code splitting - only load analytics in production */}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </div>
    </>
  );
}

// Practice #7: Web vitals reporting
export function reportWebVitals(metric: any) {
  // Separate analytics implementation
  if (process.env.NODE_ENV !== 'production') {
    console.log(metric);
  }
  // In production, send to your analytics service
  if (process.env.NODE_ENV === 'production') {
    // Example implementation for sending to analytics
    const body = JSON.stringify(metric);
    const url = '/api/analytics';
    
    // Use `navigator.sendBeacon()` if available, falling back to `fetch()`
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, body);
    } else {
      fetch(url, { body, method: 'POST', keepalive: true });
    }
  }
}