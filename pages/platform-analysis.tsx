import React from 'react';
import MainLayout from '../components/layouts/MainLayout';
import PlatformCard from '../components/content/PlatformCard';
import styles from '../styles/shared.module.css';

// Define platform data following DRY principle
const platforms = [
  {
    icon: '🌐',
    name: 'PhoenixVC.tech',
    type: 'Primary Website',
    audience: 'Technical decision-makers, system architects, senior developers',
    features: {
      format: 'Long-form technical articles (1500-3000 words)',
      media: 'Detailed diagrams, code samples, interactive examples',
      focus: 'Comprehensive coverage, technical depth, SEO',
      cadence: '1-2 articles per month',
      metrics: 'Time on page, resource downloads, return visits',
    },
    implementationStrategy: 'Structure articles with clear navigation, progressive disclosure of complex topics, and downloadable resources. Use Git-based content management to maintain version history and enable collaborative editing. Implement structured data for improved SEO performance.'
  },
  {
    icon: '🔗',
    name: 'LinkedIn',
    type: 'Professional Network',
    audience: 'Industry professionals, potential clients, peer architects',
    features: {
      format: 'Article excerpts (300-500 words), carousels',
      media: 'Professional graphics, simplified diagrams',
      focus: 'Professional tone, industry relevance',
      cadence: '2-3 posts per week',
      metrics: 'Engagement rate, profile visits, connection growth',
    },
    implementationStrategy: 'Create thought leadership posts that highlight key insights from your main articles. Use LinkedIn\'s document sharing feature for technical checklists and guides. Engage with comments to build professional relationships and establish expertise in your domain.'
  },
  {
    icon: '🐦',
    name: 'Twitter',
    type: 'Social Network',
    audience: 'Tech community, developers, industry influencers',
    features: {
      format: 'Thread breakdowns, key insights, quick tips',
      media: 'Concise visuals, GIFs, code snippets',
      focus: 'Conversational tone, technical accuracy',
      cadence: '3-5 tweets/threads per week',
      metrics: 'Retweets, thread engagement, click-through rate',
    },
    implementationStrategy: 'Create value-packed threads that break down complex topics into digestible insights. Use the first tweet as a strong hook with a clear value proposition. Incorporate relevant hashtags and engage with responses to build community around your content.'
  },
  {
    icon: '📝',
    name: 'Medium',
    type: 'Publishing Platform',
    audience: 'Tech enthusiasts, aspiring developers, generalist readers',
    features: {
      format: 'Adapted articles (1000-1500 words)',
      media: 'Clean visuals, simplified explanations',
      focus: 'Accessibility, storytelling, broader context',
      cadence: '2-4 articles per month',
      metrics: 'Claps, comments, follower growth',
    },
    implementationStrategy: 'Adapt technical content to be more accessible to a broader audience. Focus on real-world applications and benefits. Submit to relevant publications to expand reach. Include personal experiences and lessons learned to humanize complex topics.'
  },
  {
    icon: '📊',
    name: 'GitHub',
    type: 'Developer Platform',
    audience: 'Developers, open source contributors, technical practitioners',
    features: {
      format: 'Code repositories, technical documentation',
      media: 'Working examples, implementation guides',
      focus: 'Practical application, technical accuracy',
      cadence: 'Aligned with article releases',
      metrics: 'Stars, forks, pull requests',
    },
    implementationStrategy: 'Create companion repositories with working examples of concepts discussed in articles. Maintain comprehensive README files and documentation. Use GitHub Discussions to engage with developers implementing your solutions.'
  },
  {
    icon: '🎥',
    name: 'YouTube',
    type: 'Video Platform',
    audience: 'Visual learners, practitioners seeking demonstrations',
    features: {
      format: 'Tutorial videos, concept explanations (10-15 min)',
      media: 'Screen recordings, animations, diagrams',
      focus: 'Visual demonstration, step-by-step guidance',
      cadence: '1-2 videos per month',
      metrics: 'Watch time, subscriber growth, comments',
    },
    implementationStrategy: 'Create focused videos that demonstrate practical implementation of concepts from your articles. Structure videos with clear chapters for easy navigation. Include downloadable resources and code samples in video descriptions.'
  }
];

const PlatformAnalysisPage: React.FC = () => {
  return (
    <MainLayout title="Platform Analysis">
      <div className={styles.section}>
        <h2>Platform Analysis & Strategy</h2>
        <p>A comprehensive breakdown of key platforms for your technical content series, including audience characteristics, content optimization strategies, and implementation guidance.</p>
        
        <div className={styles.grid}>
          {platforms.map((platform, index) => (
            <PlatformCard
              key={index}
              icon={platform.icon}
              name={platform.name}
              type={platform.type}
              audience={platform.audience}
              features={platform.features}
              implementationStrategy={platform.implementationStrategy}
            />
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default PlatformAnalysisPage;