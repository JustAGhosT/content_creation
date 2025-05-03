import React from 'react';
import { AutomationTool, isAITool, isWorkflowTool } from '../../types/automation';
import styles from '../../styles/Automation.module.css';

interface ToolCardProps {
  tool: AutomationTool;
  onSelect: (id: string) => void;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool, onSelect }) => {
  return (
    <div className={styles.toolCard} onClick={() => onSelect(tool.id)}>
      <h3 className={styles.toolTitle}>{tool.name}</h3>
      <p className={styles.toolDescription}>{tool.description}</p>
      
      {isAITool(tool) && (
        <>
          <div className={styles.toolSection}>
            <h4>Capabilities</h4>
            <ul>
              {tool.capabilities.map((capability, index) => (
                <li key={index}>{capability}</li>
              ))}
            </ul>
          </div>
          
          <div className={styles.toolSection}>
            <h4>Best Practices</h4>
            <ul>
              {tool.bestPractices.map((practice, index) => (
                <li key={index}>{practice}</li>
              ))}
            </ul>
          </div>
          
          <div className={styles.toolSection}>
            <h4>Limitations</h4>
            <ul>
              {tool.limitations.map((limitation, index) => (
                <li key={index}>{limitation}</li>
              ))}
            </ul>
          </div>
        </>
      )}
      
      {isWorkflowTool(tool) && (
        <>
          <div className={styles.toolSection}>
            <h4>Inputs</h4>
            <ul>
              {tool.inputs.map((input, index) => (
                <li key={index}>{input}</li>
              ))}
            </ul>
          </div>
          
          <div className={styles.toolSection}>
            <h4>Processing</h4>
            <p>{tool.processing}</p>
          </div>
          
          <div className={styles.toolSection}>
            <h4>Outputs</h4>
            <ul>
              {tool.outputs.map((output, index) => (
                <li key={index}>{output}</li>
              ))}
            </ul>
          </div>
          
          <div className={styles.toolSection}>
            <h4>Implementation</h4>
            <p>{tool.implementation}</p>
          </div>
          
          {tool.imageUrl && (
            <div className={styles.toolImageContainer}>
              <img 
                src={tool.imageUrl} 
                alt={`${tool.name} visualization`} 
                className={styles.toolImage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ToolCard;