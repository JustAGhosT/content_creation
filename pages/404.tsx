import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import a suggestions component (practice #5: code splitting)
const RelatedPagesSuggestions = dynamic(
  () => import('../components/RelatedPagesSuggestions'),
  {
    loading: () => <p>Loading suggestions...</p>,
    ssr: true,
  }
);

export default function Custom404() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // Practice #7: Proper data fetching with loading state
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setIsLoading(true);
        // This would typically be an API call to get related content
        // Simulating API call with timeout
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Example suggestions
        setSuggestions([
          { title: 'Workflow Page', path: '/workflow' },
          { title: 'Platform Analysis', path: '/platform-analysis' },
          { title: 'Content Adaptation', path: '/content-adaptation' }
        ]);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, []);

  // Handle navigation back to home with loading state
  const handleGoHome = () => {
    setIsLoading(true);
    router.push('/');
  };

  return (
    <>
      {/* Practice #4: SEO improvements with proper meta tags */}
      <Head>
        <title>Page Not Found | Content Workflow Platform</title>
        <meta name="description" content="The page you are looking for cannot be found. Please check the URL or navigate back to the homepage." />
        <meta property="og:title" content="Page Not Found | Content Workflow Platform" />
        <meta property="og:description" content="The page you are looking for cannot be found." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://yoursite.com${router.asPath}`} />
        <meta property="og:image" content="https://yoursite.com/images/og-error.jpg" />
        <meta name="robots" content="noindex, follow" />
      </Head>

      <div className="error-container max-w-2xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8 text-center">
        {/* Practice #2: Image optimization using Next.js Image component */}
        <div className="relative w-64 h-64 mx-auto mb-8">
          <Image 
            src="/images/404-illustration.svg" 
            alt="404 illustration" 
            fill
            priority
            sizes="(max-width: 768px) 100vw, 256px"
            className="object-contain"
            // If you don't have this image yet, you can comment out this Image component
            // and uncomment the fallback div below
          />
          {/* Fallback if image doesn't exist yet */}
          {/* <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-full">
            <span className="text-6xl font-bold text-gray-400">404</span>
          </div> */}
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">Page not found</h1>
        <p className="mt-2 text-lg text-gray-500">The page you are looking for doesn't exist or has been moved.</p>
        
        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
          {/* Practice #3: Proper navigation using Next.js Link component */}
          <Link 
            href="/" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={(e) => {
              e.preventDefault();
              handleGoHome();
            }}
          >
            {isLoading ? 'Redirecting...' : 'Back to Home'}
          </Link>
          
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Go Back
          </button>
        </div>

        {/* Display suggestions if available */}
        {suggestions.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-medium text-gray-900">You might be looking for:</h2>
            <ul className="mt-4 border-t border-b border-gray-200 divide-y divide-gray-200">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="py-3">
                  <Link 
                    href={suggestion.path}
                    className="text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    {suggestion.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Practice #5: Code splitting with dynamically loaded component */}
        {!isLoading && suggestions.length > 0 && (
          <div className="mt-12">
            <RelatedPagesSuggestions currentPath={router.asPath} />
          </div>
        )}
      </div>
    </>
  );
}

// Practice #7: Example of getStaticProps for static data
// This is commented out since 404 pages typically don't use getStaticProps,
// but included as an example of the pattern

/*
export async function getStaticProps() {
  try {
    // For a real implementation, you might fetch common navigation links
    // or other static data that would be useful on an error page
    const commonLinks = [
      { title: 'Home', path: '/' },
      { title: 'Workflow', path: '/workflow' },
      { title: 'Platform Analysis', path: '/platform-analysis' },
    ];
    
    return {
      props: {
        commonLinks,
      },
      // Revalidate every hour
      revalidate: 3600,
    };
  } catch (error) {
    console.error('Error fetching common links:', error);
    return {
      props: {
        commonLinks: [],
        error: 'Failed to load common links',
      },
    };
  }
}
*/
