import '../styles/globals.css';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import Image from 'next/image'; // Practice #2: Image optimization
import dynamic from 'next/dynamic'; // Practice #5: Code splitting
import { useEffect, useState } from 'react';
import styles from '../styles/App.module.css'; // Extracted CSS
import siteConfig from '../content/siteConfig.json'; // Extracted JSON content

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

export default function MyApp({ Component, pageProps }: AppProps) {
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

  // Practice #4: SEO improvements
  const pageTitle = pageProps.title 
    ? `${pageProps.title} | ${siteConfig.siteName}`
    : siteConfig.siteName;
  
  const pageDescription = pageProps.description || siteConfig.siteDescription;
  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${siteConfig.siteUrl}${router.asPath}`} />
        <meta property="og:image" content={`${siteConfig.siteUrl}/images/og-image.jpg`} />
        <link rel="canonical" href={`${siteConfig.siteUrl}${router.asPath}`} />
      </Head>
      <div className={`${inter.variable} ${styles.appContainer} font-sans`}>
        <Header />
        {isLoading && (
          <div className={styles.loadingOverlay}>
            {/* Practice #2: Image optimization */}
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
        <main className={styles.mainContent}>
          <Component {...pageProps} />
        </main>
        <Footer />
        
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