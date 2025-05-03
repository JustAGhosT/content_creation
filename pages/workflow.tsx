import React from 'react';
import MainLayout from '../components/layouts/MainLayout';
import ContentHeader from '../components/content/ContentHeader';
import WorkflowDiagram from '../components/content/WorkflowDiagram';
import ContentAdaptation from '../components/content/ContentAdaptation';
import styles from '../styles/shared.module.css';

// Define workflow stages data following DRY principle
const workflowStages = [
  {
    number: 1,
    title: "Strategic Planning",
    steps: [
      {
        title: "Content Calendar Development",
        items: [
          "Schedule articles according to your quarterly series plan",
          "Allocate 2-3 weeks of production time per article",
          "Plan related content (tweets, notes, resources) for each piece",
          "Identify strategic publication dates for maximum visibility"
        ],
        tip: "Use a project management tool like Notion or Asana to maintain your content calendar with clear deadlines and dependencies."
      },
      {
        title: "Research & Resource Collection",
        items: [
          "Gather technical references and examples for each topic",
          "Identify real-world case studies that illustrate concepts",
          "Collect relevant code samples and technical diagrams",
          "Research industry context and current relevance"
        ],
        tip: "Create a dedicated research document for each article with links, quotes, and ideas that you can reference during writing."
      },
      {
        title: "Audience & Platform Analysis",
        items: [
          "Identify the primary audience segments for each article",
          "Determine which platforms will reach each segment best",
          "Plan platform-specific adaptations needed",
          "Set specific engagement goals for each platform"
        ],
        tip: "Create audience personas for your content and map each platform to the personas it best reaches."
      }
    ]
  },
  {
    number: 2,
    title: "Primary Content Creation",
    steps: [
      {
        title: "Article Development",
        items: [
          "Create detailed outline with key sections and points",
          "Write the full article optimized for phoenixvc.tech",
          "Incorporate technical examples and code snippets",
          "Develop practical applications and implementation guidance",
          "Add cross-references to related articles in the series"
        ],
        tip: "Write in modular sections that can be easily adapted or excerpted for different platforms."
      },
      {
        title: "Interactive Element Creation",
        items: [
          "Develop downloadable resources (templates, checklists)",
          "Create technical diagrams and visualizations",
          "Build interactive code examples where applicable",
          "Design implementation worksheets for readers",
          "Prepare supplementary materials for different expertise levels"
        ],
        tip: "Create a consistent visual style guide for all diagrams and resources to maintain brand identity across platforms."
      },
      {
        title: "Review & Refinement",
        items: [
          "Technical accuracy review by subject matter experts",
          "Readability and clarity assessment",
          "SEO optimization for primary keywords",
          "Feedback incorporation and revisions",
          "Final proofread and technical verification"
        ],
        tip: "Create a checklist of common issues to look for during review, such as technical accuracy, clarity of explanations, and consistent terminology."
      }
    ]
  },
  {
    number: 3,
    title: "Platform Adaptation & Distribution",
    steps: [
      {
        title: "Content Transformation",
        items: [
          "Adapt primary content for each target platform",
          "Create platform-specific headlines and hooks",
          "Optimize media assets for each platform's requirements",
          "Create platform-appropriate CTAs and engagement prompts"
        ],
        tip: "Create a content transformation template for each platform to ensure consistency in your adaptation process."
      },
      {
        title: "Publication Scheduling",
        items: [
          "Schedule primary article on phoenixvc.tech",
          "Plan staggered release across secondary platforms",
          "Coordinate cross-promotion between platforms",
          "Schedule follow-up engagement activities"
        ],
        tip: "Use a social media management tool to schedule and coordinate posts across multiple platforms from a single dashboard."
      },
      {
        title: "Engagement & Promotion",
        items: [
          "Implement active community engagement strategy",
          "Respond to comments and questions across platforms",
          "Share with relevant communities and industry groups",
          "Encourage sharing and discussion"
        ],
        tip: "Create a set of prepared responses to common questions that maintain your voice while saving time."
      }
    ]
  },
  {
    number: 4,
    title: "Analysis & Optimization",
    steps: [
      {
        title: "Performance Tracking",
        items: [
          "Monitor engagement metrics across platforms",
          "Track referral traffic to primary content",
          "Analyze audience demographics and behavior",
          "Measure against predetermined KPIs"
        ],
        tip: "Create a unified dashboard that pulls metrics from all platforms to get a holistic view of content performance."
      },
      {
        title: "Content Refinement",
        items: [
          "Update content based on audience feedback",
          "Optimize underperforming elements",
          "Expand on topics generating high engagement",
          "Create follow-up content addressing common questions"
        ],
        tip: "Keep a \"content improvement log\" where you track all feedback and ideas for future updates."
      },
      {
        title: "Process Improvement",
        items: [
          "Document lessons learned for each article",
          "Refine workflow based on production experience",
          "Update platform-specific strategies",
          "Incorporate new tools and techniques"
        ],
        tip: "Hold a brief retrospective after each article to identify what worked well and what could be improved."
      }
    ]
  }
];

// Define adaptation examples data
const adaptationExamples = [
  {
    platform: "LinkedIn",
    title: "Professional Adaptation",
    original: "The implementation of dependency injection in enterprise applications requires careful consideration of lifecycle management and scope hierarchies.",
    adaptation: "\"3 Critical Factors When Implementing DI in Enterprise Systems:</p><p>1. Lifecycle Management<br />2. Scope Hierarchies<br />3. Performance Implications</p><p>In my latest article, I break down how these factors impact your architecture decisions... [link]\"",
    notes: [
      "Transformed into list format for scannability",
      "Added value proposition (3 Critical Factors)",
      "Professional tone maintained but more conversational",
      "Clear call-to-action with link to full article"
    ]
  },
  {
    platform: "Twitter",
    title: "Concise Adaptation",
    original: "Feature flags provide a mechanism for deploying code to production while controlling its visibility and activation through configuration rather than deployment.",
    adaptation: "1/ Feature flags aren't just for A/B testing—they're a deployment strategy that separates code deployment from feature activation.</p><p>2/ This means you can deploy code on Tuesday but activate the feature next Monday without additional deployments.</p><p>3/ The real power? Gradual rollouts, instant rollbacks, and personalized experiences—all without touching your codebase.</p><p>4/ I've detailed 5 implementation patterns in my new article: [link] #DevOps #FeatureFlags",
    notes: [
      "Broken into thread format for engagement",
      "Each tweet provides standalone value",
      "Technical concept explained through benefits",
      "Strategic hashtags for discoverability"
    ]
  },
  {
    platform: "Medium",
    title: "Expanded Adaptation",
    original: "When implementing backward compatibility in APIs, versioning strategies must be carefully considered.",
    adaptation: "<strong>The Hidden Costs of API Versioning</strong></p><p>Last month, our team had to support three different API versions simultaneously. The technical debt was crushing us.</p><p>This experience taught me that versioning isn't just a technical decision—it's a business strategy with real implications for your development velocity.</p><p>Here's what we learned about balancing backward compatibility with innovation pace...",
    notes: [
      "Added personal narrative and experience",
      "Highlighted business impact beyond technical details",
      "Created emotional hook with \"crushing\" technical debt",
      "Positioned as a lesson learned rather than pure instruction"
    ]
  }
];

const WorkflowPage: React.FC = () => {
  return (
    <MainLayout title="Content Production Workflow">
      <ContentHeader 
        title="Humanizing Technical Excellence" 
        subtitle="Expanded Content Production Workflow & Platform Analysis" 
      />
      
      <div className={styles.section}>
        <h2>Comprehensive Content Production & Distribution Workflow</h2>
        <p>A detailed, step-by-step process for efficiently creating and distributing your technical content series across multiple platforms while maintaining quality and consistency.</p>
        
        <WorkflowDiagram stages={workflowStages} />
        
        <ContentAdaptation examples={adaptationExamples} />
      </div>
    </MainLayout>
  );
};

export default WorkflowPage;