import React from 'react';
import workflowStyles from '../../styles/workflow.module.css';

interface AdaptationCardProps {
  platform: string;
  title: string;
  original: string;
  adaptation: string;
  notes: string[];
}

const AdaptationCard: React.FC<AdaptationCardProps> = ({
  platform,
  title,
  original,
  adaptation,
  notes
}) => {
  return (
    <div className={workflowStyles['adaptation-card']}>
      <h4>
        <span className={workflowStyles['platform-badge']}>{platform}</span> {title}
      </h4>
      <div className={workflowStyles.example}>
        <div className={workflowStyles.title}>Original Article Section:</div>
        <p>{original}</p>
        
        <div className={workflowStyles.title}>{platform} Adaptation:</div>
        <div dangerouslySetInnerHTML={{ __html: adaptation }} />
      </div>
      <div className={workflowStyles.notes}>
        <p>Key adaptation elements:</p>
        <ul>
          {notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AdaptationCard;