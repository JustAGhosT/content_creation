import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Layout from '../components/Layout'; // Using the shared layout
import styles from '../styles/Automation.module.css'; // Extracted CSS
import automationTools from '../content/automationTools.json'; // Extracted JSON content

// Practice #5: Code splitting with dynamic imports
const AutomationToolDetail = dynamic(
  () => import('../components/AutomationToolDetail'),
  {
    loading: () => <p className={styles.loadingComponent}>Loading tool details...</p>,
    ssr: true,
  }
);

// Types for our data
interface AutomationTool {
  id: string;
  name: string;
  description: string;
  inputs: string[];
  processing: string;
  outputs: string[];
  implementation: string;
  imageUrl: string;
}

const AutomationPage: React.FC = () => {
  const router = useRouter();
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [tools, setTools] = useState<AutomationTool[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Practice #7: Proper data fetching with loading state
  useEffect(() => {
    const fetchAutomationTools = async () => {
      try {
        setIsLoading(true);
        // In a real implementation, this would be an API call
        // For now, we'll simulate a data fetch with a timeout
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Set tools from our imported JSON
        setTools(automationTools.tools);
      } catch (err) {
        console.error('Error fetching automation tools:', err);
        setError('Failed to load automation tools. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAutomationTools();
  }, []);

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
  };

  return (
    <Layout
      title="Workflow Automation"
      description="Leverage system architecture expertise to automate repetitive tasks in your content workflow, improving efficiency and consistency."
      ogImage="https://yoursite.com/images/og-automation.jpg"
                    >
      <div className={styles.container}>
        <div className={styles.section}>
          <div className={styles.automation}>
            <h2>Workflow Automation Opportunities</h2>
            <p>Leverage your system architecture expertise to automate repetitive tasks in your content workflow, improving efficiency and consistency.</p>
            
            {error && <div className={styles.error}>{error}</div>}
            
            {isLoading ? (
              <div className={styles.loading}>
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
                <p>Loading automation tools...</p>
              </div>
            ) : (
              <div className={styles.automationContainer}>
                <div className={styles.automationTools}>
                  {tools.map((tool) => (
                    <div 
                      key={tool.id} 
                      className={styles.toolCard}
                      onClick={() => handleToolSelect(tool.id)}
                    >
                      {/* Practice #2: Image optimization using Next.js Image component */}
                      <div className={styles.toolImage}>
                        <Image
                          src={tool.imageUrl}
                          alt={`${tool.name} illustration`}
                          fill
                          sizes="(max-width: 768px) 100vw, 250px"
                          className="object-contain"
                          // Fallback if images don't exist yet
                          onError={(e) => {
                            // @ts-ignore
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                      <h4>{tool.name}</h4>
                      <p>{tool.description}</p>
                      <ul>
                        <li><strong>Input:</strong> {tool.inputs[0]}</li>
                        <li><strong>Processing:</strong> {tool.processing}</li>
                        <li><strong>Output:</strong> {tool.outputs[0]}</li>
                      </ul>
                      <p>{tool.implementation}</p>
          </div>
                  ))}
        </div>
      </div>
            )}
            
            {/* Practice #5: Code splitting - dynamically loaded component */}
            {selectedTool && (
              <div className={styles.toolDetailModal} onClick={() => setSelectedTool(null)}>
                <div className={styles.toolDetailContent} onClick={(e) => e.stopPropagation()}>
                  <AutomationToolDetail 
                    toolId={selectedTool} 
                    onClose={() => setSelectedTool(null)}
                  />
                </div>
              </div>
            )}
            
            <div className={styles.conclusion}>
              <h3>Leveraging Your Technical Excellence</h3>
              <p>As a system architect with expertise in application versioning, dependency injection, and feature flags, you're uniquely positioned to create a content workflow that embodies the same principles of modularity, extensibility, and maintainability that you apply to your code.</p>
              
              <p>By treating your content as a product with clear versioning, dependencies, and feature toggles, you can create a sustainable system that scales with your growing audience while maintaining the technical excellence that defines your work.</p>
              
              <p>The workflow and platform analysis outlined in this document provides a framework that balances technical depth with accessibility, allowing you to share your expertise effectively across multiple platforms while maintaining a consistent voice and quality standard.</p>
              
              <p>By implementing the suggested automation opportunities, you'll create a content production system that reflects your architectural approach—efficient, scalable, and built for long-term success.</p>
            </div>
            
            {/* Practice #3: Proper navigation using Next.js Link component */}
            <div className={styles.navigationLinks}>
              <Link href="/workflow" className={styles.navLink}>
                ← View Content Production Workflow
              </Link>
              <Link href="/platform-analysis" className={styles.navLink}>
                Explore Platform Analysis →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Practice #7: Example of getStaticProps for static data
export async function getStaticProps() {
  try {
    // In a real implementation, you might fetch this data from an API or CMS
    return {
      props: {
        // Initial props would go here
      },
      // Revalidate every hour
      revalidate: 3600,
    };
  } catch (error) {
    console.error('Error in getStaticProps:', error);
    return {
      props: {
        error: 'Failed to load initial data',
      },
    };
  }
}

export default AutomationPage;