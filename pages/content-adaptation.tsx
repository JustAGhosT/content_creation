import React from 'react';
import Head from 'next/head';
import Image from 'next/image'; // Practice #2: Image optimization
import Link from 'next/link'; // Practice #3: Proper navigation
import { useRouter } from 'next/router'; // For SEO
import Layout from '../components/Layout'; // Using the shared layout
import styles from '../styles/ContentAdaptation.module.css'; // Extracted CSS
import adaptationExamples from '../content/adaptationExamples.json'; // Extracted JSON content

const ContentAdaptationPage: React.FC = () => {
  const router = useRouter();

  return (
    <Layout
      title="Content Adaptation Strategies"
      description="Strategic approaches for adapting your technical content to different platforms while maintaining consistency and quality."
    >
      <div className={styles.container}>
        <div className={styles.section}>
          <div className={styles.workflow}>
            <div className={styles.workflowContainer}>
              <div className={styles.workflowDiagram}>
                <div className={styles.workflowStage}>
                  <div className={styles.stageHeader}>
                    <div className={styles.stageNumber}>3</div>
                    <h3 className={styles.stageTitle}>Platform Adaptation & Distribution</h3>
                  </div>
                  <div className={styles.stageSteps}>
                    <div className={styles.stepCard}>
                      <h4>Content Transformation</h4>
                      <ul>
                        <li>Adapt primary content for each target platform</li>
                        <li>Create platform-specific headlines and hooks</li>
                        <li>Optimize media assets for each platform's requirements</li>
                        <li>Create platform-appropriate CTAs and engagement prompts</li>
                      </ul>
                      <div className={styles.tip}>
                        <strong>Pro Tip:</strong> Create a content transformation template for each platform to ensure consistency in your adaptation process.
                      </div>
                    </div>
                    
                    <div className={styles.stepCard}>
                      <h4>Publication Scheduling</h4>
                      <ul>
                        <li>Schedule primary article on phoenixvc.tech</li>
                        <li>Plan staggered release across secondary platforms</li>
                        <li>Coordinate cross-promotion between platforms</li>
                        <li>Schedule follow-up engagement activities</li>
                      </ul>
                      <div className={styles.tip}>
                        <strong>Pro Tip:</strong> Use a social media management tool to schedule and coordinate posts across multiple platforms from a single dashboard.
                      </div>
                    </div>
                    
                    <div className={styles.stepCard}>
                      <h4>Engagement & Promotion</h4>
                      <ul>
                        <li>Implement active community engagement strategy</li>
                        <li>Respond to comments and questions across platforms</li>
                        <li>Share with relevant communities and industry groups</li>
                        <li>Encourage sharing and discussion</li>
                      </ul>
                      <div className={styles.tip}>
                        <strong>Pro Tip:</strong> Create a set of prepared responses to common questions that maintain your voice while saving time.
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className={styles.workflowStage}>
                  <div className={styles.stageHeader}>
                    <div className={styles.stageNumber}>4</div>
                    <h3 className={styles.stageTitle}>Analysis & Optimization</h3>
                  </div>
                  <div className={styles.stageSteps}>
                    <div className={styles.stepCard}>
                      <h4>Performance Tracking</h4>
                      <ul>
                        <li>Monitor engagement metrics across platforms</li>
                        <li>Track referral traffic to primary content</li>
                        <li>Analyze audience demographics and behavior</li>
                        <li>Measure against predetermined KPIs</li>
                      </ul>
                      <div className={styles.tip}>
                        <strong>Pro Tip:</strong> Create a unified dashboard that pulls metrics from all platforms to get a holistic view of content performance.
                      </div>
                    </div>
                    
                    <div className={styles.stepCard}>
                      <h4>Content Refinement</h4>
                      <ul>
                        <li>Update content based on audience feedback</li>
                        <li>Optimize underperforming elements</li>
                        <li>Expand on topics generating high engagement</li>
                        <li>Create follow-up content addressing common questions</li>
                      </ul>
                      <div className={styles.tip}>
                        <strong>Pro Tip:</strong> Keep a "content improvement log" where you track all feedback and ideas for future updates.
                      </div>
                    </div>
                    
                    <div className={styles.stepCard}>
                      <h4>Process Improvement</h4>
                      <ul>
                        <li>Document lessons learned for each article</li>
                        <li>Refine workflow based on production experience</li>
                        <li>Update platform-specific strategies</li>
                        <li>Incorporate new tools and techniques</li>
                      </ul>
                      <div className={styles.tip}>
                        <strong>Pro Tip:</strong> Hold a brief retrospective after each article to identify what worked well and what could be improved.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className={styles.contentAdaptation}>
            <h3>Content Adaptation Examples</h3>
            <p>Strategic approaches for adapting your technical content to different platforms while maintaining consistency and quality.</p>
            
            <div className={styles.adaptationContainer}>
              <div className={styles.adaptationExamples}>
                {adaptationExamples.examples.map((example, index) => (
                  <div key={index} className={styles.adaptationCard}>
                    <h4>
                      <span className={styles.platformBadge}>{example.platform}</span> 
                      {example.type} Adaptation
                    </h4>
                    <div className={styles.example}>
                      <div className={styles.title}>Original Article Section:</div>
                      <p>{example.original}</p>
                      
                      <div className={styles.title}>{example.platform} Adaptation:</div>
                      <div dangerouslySetInnerHTML={{ __html: example.adaptation }} />
                    </div>
                    <div className={styles.notes}>
                    <p>Key adaptation elements:</p>
                    <ul>
                        {example.elements.map((element, i) => (
                          <li key={i}>{element}</li>
                        ))}
                      </ul>
                </div>
                
                    {/* Practice #2: Image optimization */}
                    {example.image && (
                      <div className={styles.exampleImage}>
                        <Image
                          src={example.image}
                          alt={`${example.platform} adaptation example`}
                          width={300}
                          height={200}
                          objectFit="contain"
                        />
                  </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Practice #3: Proper navigation */}
          <div className={styles.navigationLinks}>
            <Link href="/workflow" className={styles.navLink}>
              ← View Complete Workflow
            </Link>
            <Link href="/automation" className={styles.navLink}>
              Explore Automation Opportunities →
            </Link>
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
        // Any static props would go here
      },
      // Revalidate every day
      revalidate: 86400,
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

export default ContentAdaptationPage;