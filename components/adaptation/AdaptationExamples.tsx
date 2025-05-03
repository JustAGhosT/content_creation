import React from 'react';
import AdaptationCard from './AdaptationCard';
import styles from '../../styles/ContentAdaptation.module.css';

interface AdaptationExample {
  platform: string;
  type: string;
  original: string;
  adaptation: string;
  elements: string[];
  image?: string;
}

interface AdaptationExamplesProps {
  examples: AdaptationExample[];
}

/**
 * Component for displaying a collection of content adaptation examples
 */
const AdaptationExamples: React.FC<AdaptationExamplesProps> = ({ examples }) => {
  return (
    <div className={styles.contentAdaptation}>
      <h3>Content Adaptation Examples</h3>
      <p>Strategic approaches for adapting your technical content to different platforms while maintaining consistency and quality.</p>
      
      <div className={styles.adaptationContainer}>
        <div className={styles.adaptationExamples}>
          {examples.map((example, index) => (
            <AdaptationCard
              key={index}
              platform={example.platform}
              type={example.type}
              original={example.original}
              adaptation={example.adaptation}
              elements={example.elements}
              image={example.image}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdaptationExamples;