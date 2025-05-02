import Head from 'next/head';
import React from 'react';

const PlatformAnalysisPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Platform Analysis</title>
        <style>{`
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 100%;
            margin: 0;
            padding: 0;
          }
          .container {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            padding: 1.5rem;
          }
          .section {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .section h2 {
            margin-top: 0;
            color: #2c3e50;
            border-bottom: 2px solid #4a6491;
            padding-bottom: 0.5rem;
          }
          .platform-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin: 1.5rem 0;
          }
          .platform-card {
            background-color: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            display: flex;
            flex-direction: column;
          }
          .platform-card .platform-header {
            display: flex;
            align-items: center;
            gap: 0.8rem;
            margin-bottom: 1rem;
          }
          .platform-card .platform-icon {
            width: 40px;
            height: 40px;
            background-color: #f8f9fa;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
          }
          .platform-card h3 {
            margin: 0;
            color: #2c3e50;
            font-size: 1.3rem;
          }
          .platform-card .platform-type {
            margin: 0;
            font-size: 0.85rem;
            color: #666;
          }
          .platform-card .audience {
            background-color: #f8f9fa;
            padding: 0.5rem;
            border-radius: 4px;
            margin: 0.5rem 0;
            font-size: 0.9rem;
          }
          .platform-card .audience strong {
            color: #2c3e50;
          }
          .platform-card ul {
            padding-left: 1.2rem;
            margin: 0.5rem 0;
            flex-grow: 1;
          }
          .platform-card li {
            margin-bottom: 0.5rem;
            font-size: 0.9rem;
          }
          .platform-card .implementation {
            background-color: #f1f5f9;
            padding: 0.8rem;
            border-radius: 4px;
            margin-top: 1rem;
            font-size: 0.9rem;
          }
          .platform-card .implementation h4 {
            margin: 0 0 0.5rem 0;
            font-size: 1rem;
          }
          .platform-card .implementation p {
            margin: 0;
          }
          @media (max-width: 768px) {
            .platform-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </Head>
      <div className="container">
        <div className="section">
          <h2>Platform Analysis & Strategy</h2>
          <p>A comprehensive breakdown of key platforms for your technical content series, including audience characteristics, content optimization strategies, and implementation guidance.</p>
          
          <div className="platform-grid">
            <div className="platform-card">
              <div className="platform-header">
                <div className="platform-icon">🌐</div>
                <div>
                  <h3>PhoenixVC.tech</h3>
                  <p className="platform-type">Primary Website</p>
                </div>
              </div>
              
              <div className="audience">
                <strong>Primary Audience:</strong> Technical decision-makers, system architects, senior developers
              </div>
              
              <ul>
                <li><strong>Content Format:</strong> Long-form technical articles (1500-3000 words)</li>
                <li><strong>Media Elements:</strong> Detailed diagrams, code samples, interactive examples</li>
                <li><strong>Optimization Focus:</strong> Comprehensive coverage, technical depth, SEO</li>
                <li><strong>Publication Cadence:</strong> 1-2 articles per month</li>
                <li><strong>Success Metrics:</strong> Time on page, resource downloads, return visits</li>
              </ul>
              
              <div className="implementation">
                <h4>Implementation Strategy:</h4>
                <p>Structure articles with clear navigation, progressive disclosure of complex topics, and downloadable resources. Use Git-based content management to maintain version history and enable collaborative editing. Implement structured data for improved SEO performance.</p>
              </div>
            </div>
            
            <div className="platform-card">
              <div className="platform-header">
                <div className="platform-icon">🔗</div>
                <div>
                  <h3>LinkedIn</h3>
                  <p className="platform-type">Professional Network</p>
                </div>
              </div>
              
              <div className="audience">
                <strong>Primary Audience:</strong> Industry professionals, potential clients, peer architects
              </div>
              
              <ul>
                <li><strong>Content Format:</strong> Article excerpts (300-500 words), carousels</li>
                <li><strong>Media Elements:</strong> Professional graphics, simplified diagrams</li>
                <li><strong>Optimization Focus:</strong> Professional tone, industry relevance</li>
                <li><strong>Publication Cadence:</strong> 2-3 posts per week</li>
                <li><strong>Success Metrics:</strong> Engagement rate, profile visits, connection growth</li>
              </ul>
              
              <div className="implementation">
                <h4>Implementation Strategy:</h4>
                <p>Create thought leadership posts that highlight key insights from your main articles. Use LinkedIn's document sharing feature for technical checklists and guides. Engage with comments to build professional relationships and establish expertise in your domain.</p>
              </div>
            </div>
            
            <div className="platform-card">
              <div className="platform-header">
                <div className="platform-icon">🐦</div>
                <div>
                  <h3>Twitter</h3>
                  <p className="platform-type">Social Network</p>
                </div>
              </div>
              
              <div className="audience">
                <strong>Primary Audience:</strong> Tech community, developers, industry influencers
              </div>
              
              <ul>
                <li><strong>Content Format:</strong> Thread breakdowns, key insights, quick tips</li>
                <li><strong>Media Elements:</strong> Concise visuals, GIFs, code snippets</li>
                <li><strong>Optimization Focus:</strong> Conversational tone, technical accuracy</li>
                <li><strong>Publication Cadence:</strong> 3-5 tweets/threads per week</li>
                <li><strong>Success Metrics:</strong> Retweets, thread engagement, click-through rate</li>
              </ul>
              
              <div className="implementation">
                <h4>Implementation Strategy:</h4>
                <p>Create value-packed threads that break down complex topics into digestible insights. Use the first tweet as a strong hook with a clear value proposition. Incorporate relevant hashtags and engage with responses to build community around your content.</p>
              </div>
            </div>
            
            <div className="platform-card">
              <div className="platform-header">
                <div className="platform-icon">📝</div>
                <div>
                  <h3>Medium</h3>
                  <p className="platform-type">Publishing Platform</p>
                </div>
              </div>
              
              <div className="audience">
                <strong>Primary Audience:</strong> Tech enthusiasts, aspiring developers, generalist readers
              </div>
              
              <ul>
                <li><strong>Content Format:</strong> Adapted articles (1000-1500 words)</li>
                <li><strong>Media Elements:</strong> Clean visuals, simplified explanations</li>
                <li><strong>Optimization Focus:</strong> Accessibility, storytelling, broader context</li>
                <li><strong>Publication Cadence:</strong> 2-4 articles per month</li>
                <li><strong>Success Metrics:</strong> Claps, comments, follower growth</li>
              </ul>
              
              <div className="implementation">
                <h4>Implementation Strategy:</h4>
                <p>Adapt technical content to be more accessible to a broader audience. Focus on real-world applications and benefits. Submit to relevant publications to expand reach. Include personal experiences and lessons learned to humanize complex topics.</p>
              </div>
            </div>
            
            <div className="platform-card">
              <div className="platform-header">
                <div className="platform-icon">📊</div>
                <div>
                  <h3>GitHub</h3>
                  <p className="platform-type">Developer Platform</p>
                </div>
              </div>
              
              <div className="audience">
                <strong>Primary Audience:</strong> Developers, open source contributors, technical practitioners
              </div>
              
              <ul>
                <li><strong>Content Format:</strong> Code repositories, technical documentation</li>
                <li><strong>Media Elements:</strong> Working examples, implementation guides</li>
                <li><strong>Optimization Focus:</strong> Practical application, technical accuracy</li>
                <li><strong>Publication Cadence:</strong> Aligned with article releases</li>
                <li><strong>Success Metrics:</strong> Stars, forks, pull requests</li>
              </ul>
              
              <div className="implementation">
                <h4>Implementation Strategy:</h4>
                <p>Create companion repositories with working examples of concepts discussed in articles. Maintain comprehensive README files and documentation. Use GitHub Discussions to engage with developers implementing your solutions.</p>
              </div>
            </div>
            
            <div className="platform-card">
              <div className="platform-header">
                <div className="platform-icon">🎥</div>
                <div>
                  <h3>YouTube</h3>
                  <p className="platform-type">Video Platform</p>
                </div>
              </div>
              
              <div className="audience">
                <strong>Primary Audience:</strong> Visual learners, practitioners seeking demonstrations
              </div>
              
              <ul>
                <li><strong>Content Format:</strong> Tutorial videos, concept explanations (10-15 min)</li>
                <li><strong>Media Elements:</strong> Screen recordings, animations, diagrams</li>
                <li><strong>Optimization Focus:</strong> Visual demonstration, step-by-step guidance</li>
                <li><strong>Publication Cadence:</strong> 1-2 videos per month</li>
                <li><strong>Success Metrics:</strong> Watch time, subscriber growth, comments</li>
              </ul>
              
              <div className="implementation">
                <h4>Implementation Strategy:</h4>
                <p>Create focused videos that demonstrate practical implementation of concepts from your articles. Structure videos with clear chapters for easy navigation. Include downloadable resources and code samples in video descriptions.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PlatformAnalysisPage;