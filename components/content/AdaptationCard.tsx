import React from 'react';
import workflowStyles from '../../styles/workflow.module.css';
import DOMPurify from 'dompurify';

// In a single location, e.g., components/shared/AdaptationCard.tsx
interface AdaptationCardProps {
  platform: string;
  title: string;
  original: string;
  adaptation: string;
  notes: string[];
  image?: string;
  styleModule?: 'content' | 'workflow';
}

const AdaptationCard: React.FC<AdaptationCardProps> = ({
  platform,
  title,
  original,
  adaptation,
  notes,
  image,
  styleModule = 'workflow'
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
        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(adaptation) }} />
        <p>Key adaptation elements:</p>
        <ul>
          {notes && notes.map((note) => (
            <li key={`note-${note.substring(0, 20).replace(/\s+/g, '-')}`}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AdaptationCard;