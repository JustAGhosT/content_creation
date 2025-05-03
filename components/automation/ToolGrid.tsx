import React from 'react';
import ToolCard from './ToolCard';
import { AutomationTool } from '../../types/automation';
import styles from '../../styles/Automation.module.css';

interface ToolGridProps {
  tools: AutomationTool[];
  onSelectTool: (id: string) => void;
}

/**
 * Component for displaying a grid of automation tools
 */
const ToolGrid: React.FC<ToolGridProps> = ({ tools, onSelectTool }) => {
  return (
    <div className={styles.automationContainer}>
      <div className={styles.automationTools}>
        {tools.map((tool) => (
          <ToolCard 
            key={tool.id} 
            tool={tool} 
            onSelect={onSelectTool} 
          />
        ))}
      </div>
    </div>
  );
};

export default ToolGrid;