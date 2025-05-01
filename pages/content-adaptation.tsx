import React from 'react';
import type { NextPage } from 'next';
import WorkflowStage from '../components/content-adaptation/WorkflowStage';
import AdaptationCard from '../components/content-adaptation/AdaptationCard';
import ContentAdaptationStyles from '../components/content-adaptation/ContentAdaptationStyles';

const ContentAdaptationPage: NextPage = () => {
  // Data for the workflow stages
  const stageThreeData = {
    stageNumber: 3,
    stageTitle: "Platform Adaptation & Distribution",
    steps: [
      {
        title: "Content Transformation",
        steps: [
          "Adapt primary content for each target platform",
          "Create platform-specific headlines and hooks",
          "Optimize media assets for each platform's requirements",
          "Create platform-appropriate CTAs and engagement prompts"
        ],
        tip: "Create a content transformation template for each platform to ensure consistency in your adaptation process."
      },
      {
        title: "Publication Scheduling",
        steps: [
          "Schedule primary article on phoenixvc.tech",
          "Plan staggered release across secondary platforms",
          "Coordinate cross-promotion between platforms",
          "Schedule follow-up engagement activities"
        ],
        tip: "Use a social media management tool to schedule and coordinate posts across multiple platforms from a single dashboard."
      },
      {
        title: "Engagement & Promotion",
        steps: [
          "Implement active community engagement strategy",
          "Respond to comments and questions across platforms",
          "Share with relevant communities and industry groups",
          "Encourage sharing and discussion"
        ],
        tip: "Create a set of prepared responses to common questions that maintain your voice while saving time."
      }
    ]
  };

  const stageFourData = {
    stageNumber: 4,
    stageTitle: "Analysis & Optimization",
    steps: [
      {
        title: "Performance Tracking",
        steps: [
          "Monitor engagement metrics across platforms",
          "Track referral traffic to primary content",
          "Analyze audience demographics and behavior",
          "Measure against predetermined KPIs"
        ],
        tip: "Create a unified dashboard that pulls metrics from all platforms to get a holistic view of content performance."
      },
      {
        title: "Content Refinement",
        steps: [
          "Update content based on audience feedback",
          "Optimize underperforming elements",
          "Expand on topics generating high engagement",
          "Create follow-up content addressing common questions"
        ],
        tip: "Keep a \"content improvement log\" where you track all feedback and ideas for future updates."
      },
      {
        title: "Process Improvement",
        steps: [
          "Document lessons learned for each article",
          "Refine workflow based on production experience",
          "Update platform-specific strategies",
          "Incorporate new tools and techniques"
        ],
        tip: "Hold a brief retrospective after each article to identify what worked well and what could be improved."
      }
    ]
  };

  // Data for adaptation examples
  const adaptationExamples = [
    {
      platform: "LinkedIn",
      title: "Professional Adaptation",
      originalContent: "The implementation of dependency injection in enterprise applications requires careful consideration of lifecycle management and scope hierarchies.",
      adaptedContent: "\"3 Critical Factors When Implementing DI in Enterprise Systems:<br><br>1. Lifecycle Management<br>2. Scope Hierarchies<br>3. Performance Implications<br><br>In my latest article, I break down how these factors impact your architecture decisions... [link]\"",
      adaptationElements: [
        "Transformed into list format for scannability",
        "Added value proposition (3 Critical Factors)",
        "Professional tone maintained but more conversational",
        "Clear call-to-action with link to full article"
      ]
    },
    {
      platform: "Twitter",
      title: "Concise Adaptation",
      originalContent: "Feature flags provide a mechanism for deploying code to production while controlling its visibility and activation through configuration rather than deployment.",
      adaptedContent: "1/ Feature flags aren't just for A/B testing—they're a deployment strategy that separates code deployment from feature activation.<br><br>2/ This means you can deploy code on Tuesday but activate the feature next Monday without additional deployments.<br><br>3/ The real power? Gradual rollouts, instant rollbacks, and personalized experiences—all without touching your codebase.<br><br>4/ I've detailed 5 implementation patterns in my new article: [link] #DevOps #FeatureFlags",
      adaptationElements: [
        "Broken into thread format for engagement",
        "Each tweet provides standalone value",
        "Technical concept explained through benefits",
        "Strategic hashtags for discoverability"
      ]
    },
    {
      platform: "Medium",
      title: "Expanded Adaptation",
      originalContent: "When implementing backward compatibility in APIs, versioning strategies must be carefully considered.",
      adaptedContent: "<strong>The Hidden Costs of API Versioning</strong><br><br>Last month, our team had to support three different API versions simultaneously. The technical debt was crushing us.<br><br>This experience taught me that versioning isn't just a technical decision—it's a business strategy with real implications for your development velocity.<br><br>Here's what we learned about balancing backward compatibility with innovation pace...",
      adaptationElements: [
        "Added personal narrative and experience",
        "Highlighted business impact beyond technical details",
        "Created emotional hook with \"crushing\" technical debt",
        "Positioned as a lesson learned rather than pure instruction"
      ]
    }
  ];

  return (
    <>
      <ContentAdaptationStyles />
      <div className="container">
        <div className="section">
          <div className="workflow">
            <div className="workflow-container">
              <div className="workflow-diagram">
                <WorkflowStage 
                  stageNumber={stageThreeData.stageNumber}
                  stageTitle={stageThreeData.stageTitle}
                  steps={stageThreeData.steps}
                />
                
                <WorkflowStage 
                  stageNumber={stageFourData.stageNumber}
                  stageTitle={stageFourData.stageTitle}
                  steps={stageFourData.steps}
                />
              </div>
            </div>
          </div>
          
          <div className="content-adaptation">
            <h3>Content Adaptation Examples</h3>
            <p>Strategic approaches for adapting your technical content to different platforms while maintaining consistency and quality.</p>
            
            <div className="adaptation-container">
              <div className="adaptation-examples">
                {adaptationExamples.map((example, index) => (
                  <AdaptationCard
                    key={index}
                    platform={example.platform}
                    title={example.title}
                    originalContent={example.originalContent}
                    adaptedContent={example.adaptedContent}
                    adaptationElements={example.adaptationElements}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContentAdaptationPage;