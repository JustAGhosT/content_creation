import { useEffect } from 'react';
import { useRouter } from 'next/router';
import siteConfig from '../content/siteConfig.json';

const Analytics: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    // Only run in production or if explicitly enabled in development
    if (process.env.NODE_ENV !== 'production' && !siteConfig.analytics.enabledInDevelopment) {
      return;
    }

    // Example Google Analytics setup
    if (siteConfig.analytics.googleAnalyticsId) {
      // This would be your Google Analytics or other analytics setup
      // For example:
      // window.gtag('config', siteConfig.analytics.googleAnalyticsId, {
      //   page_path: router.asPath,
      // });
      console.log('Analytics initialized for', router.asPath);
    }
  }, [router.asPath]);

  return null; // This component doesn't render anything
};

export default Analytics;