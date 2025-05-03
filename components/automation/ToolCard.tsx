import React from 'react';
import Image from 'next/image';
import { AutomationTool } from '../../types/automation';
import styles from '../../styles/Automation.module.css';

interface ToolCardProps {
  tool: AutomationTool;
  onSelect: (id: string) => void;
}

/**
 * Component for displaying an individual automation tool card
 */
const ToolCard: React.FC<ToolCardProps> = ({ tool, onSelect }) => {
  return (
    <div 
      className={styles.toolCard}
      onClick={() => onSelect(tool.id)}
    >
      <div className={styles.toolImage}>
        <Image
          src={tool.imageUrl}
          alt={`${tool.name} illustration`}
          fill
          sizes="(max-width: 768px) 100vw, 250px"
          className="object-contain"
          // Fallback if images don't exist yet
          onError={(e) => {
            // @ts-ignore
            e.target.style.display = 'none';
          }}
        />
      </div>
      <h4>{tool.name}</h4>
      <p>{tool.description}</p>
      <ul>
        <li><strong>Input:</strong> {tool.inputs[0]}</li>
        <li><strong>Processing:</strong> {tool.processing}</li>
        <li><strong>Output:</strong> {tool.outputs[0]}</li>
      </ul>
      <p>{tool.implementation}</p>
    </div>
  );
};

export default ToolCard;