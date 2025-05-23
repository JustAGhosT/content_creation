import React from 'react';
import Image from 'next/image';
import styles from '../../styles/ContentAdaptation.module.css';

interface AdaptationCardProps {
  platform: string;
  type: string;
  original: string;
  adaptation: string;
  elements: string[];
  image?: string;
}

/**
 * Component for displaying a content adaptation example
 */
const AdaptationCard: React.FC<AdaptationCardProps> = ({
  platform,
  type,
  original,
  adaptation,
  elements,
  image
}) => {
  return (
    <div className={styles.adaptationCard}>
      <h4>
        <span className={styles.platformBadge}>{platform}</span> 
        {type} Adaptation
      </h4>
      <div className={styles.example}>
        <div className={styles.title}>Original Article Section:</div>
        <p>{original}</p>
        
        <div className={styles.title}>{platform} Adaptation:</div>
        <div dangerouslySetInnerHTML={{ __html: adaptation }} />
      </div>
      <div className={styles.notes}>
        <p>Key adaptation elements:</p>
        <ul>
          {elements.map((element, i) => (
            <li key={i}>{element}</li>
          ))}
        </ul>
      </div>
      
      {image && (
        <div className={styles.exampleImage}>
          <Image
            src={image}
            alt={`${platform} adaptation example`}
            width={300}
            height={200}
            objectFit="contain"
          />
        </div>
      )}
    </div>
  );
};

export default AdaptationCard;