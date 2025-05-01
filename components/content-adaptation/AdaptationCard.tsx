import React from 'react';

interface AdaptationCardProps {
  platform: string;
  title: string;
  originalContent: string;
  adaptedContent: string;
  adaptationElements: string[];
}

const AdaptationCard: React.FC<AdaptationCardProps> = ({ 
  platform, 
  title, 
  originalContent, 
  adaptedContent, 
  adaptationElements 
}) => {
  return (
    <div className="adaptation-card">
      <h4>
        <span className="platform-badge">{platform}</span> {title}
      </h4>
      <div className="example">
        <div className="title">Original Article Section:</div>
        <p>{originalContent}</p>
        
        <div className="title">{platform} Adaptation:</div>
        <div dangerouslySetInnerHTML={{ __html: adaptedContent }} />
      </div>
      <div className="notes">
        <p>Key adaptation elements:</p>
        <ul>
          {adaptationElements.map((element, index) => (
            <li key={index}>{element}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AdaptationCard;