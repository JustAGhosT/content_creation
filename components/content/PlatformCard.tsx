import React from 'react';
import styles from '../../styles/shared.module.css';

interface PlatformCardProps {
  icon: string;
  name: string;
  type: string;
  audience: string;
  features: {
    format: string;
    media: string;
    focus: string;
    cadence: string;
    metrics: string;
  };
  implementationStrategy: string;
}

const PlatformCard: React.FC<PlatformCardProps> = ({
  icon,
  name,
  type,
  audience,
  features,
  implementationStrategy
}) => {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.icon}>{icon}</div>
        <div>
          <h3>{name}</h3>
          <p className={styles.subtitle}>{type}</p>
        </div>
      </div>
      
      <div className={styles.highlight}>
        <strong>Primary Audience:</strong> {audience}
      </div>
      
      <ul>
        <li><strong>Content Format:</strong> {features.format}</li>
        <li><strong>Media Elements:</strong> {features.media}</li>
        <li><strong>Optimization Focus:</strong> {features.focus}</li>
        <li><strong>Publication Cadence:</strong> {features.cadence}</li>
        <li><strong>Success Metrics:</strong> {features.metrics}</li>
      </ul>
      
      <div className={styles.infoBox}>
        <h4>Implementation Strategy:</h4>
        <p>{implementationStrategy}</p>
      </div>
    </div>
  );
};

export default PlatformCard;