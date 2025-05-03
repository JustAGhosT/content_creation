import React from 'react';
import AdaptationCard from './AdaptationCard';
import workflowStyles from '../../styles/workflow.module.css';

interface AdaptationExample {
  platform: string;
  title: string;
  original: string;
  adaptation: string;
  notes: string[];
}

interface ContentAdaptationProps {
  examples: AdaptationExample[];
}

const ContentAdaptation: React.FC<ContentAdaptationProps> = ({ examples }) => {
  return (
    <div className={workflowStyles['content-adaptation']}>
      <h3>Content Adaptation Examples</h3>
      <p>Strategic approaches for adapting your technical content to different platforms while maintaining consistency and quality.</p>
      
      <div className={workflowStyles['adaptation-container']}>
        <div className={workflowStyles['adaptation-examples']}>
          {examples.map((example, index) => (
            <AdaptationCard
              key={index}
              platform={example.platform}
              title={example.title}
              original={example.original}
              adaptation={example.adaptation}
              notes={example.notes}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContentAdaptation;