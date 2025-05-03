import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from '../styles/Automation.module.css';
import { AutomationTool } from '../types/automation';

interface AutomationToolDetailProps {
  toolId: string;
  onClose: () => void;
}

const AutomationToolDetail: React.FC<AutomationToolDetailProps> = ({ toolId, onClose }) => {
  const [tool, setTool] = useState<AutomationTool | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToolDetails = async () => {
      try {
        setLoading(true);
        // In a real app, this would be an API call
        // For now, we'll import the data directly
        const { default: automationTools } = await import('../content/automationTools.json');
        const foundTool = automationTools.find((t: AutomationTool) => t.id === toolId);
        
        if (foundTool) {
          setTool(foundTool);
        } else {
          setError(`Tool with ID ${toolId} not found`);
        }
      } catch (err) {
        setError('Failed to load tool details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchToolDetails();
  }, [toolId]);

  if (loading) {
    return (
      <div className={styles.toolDetailLoading}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading tool details...</p>
      </div>
    );
  }

  if (error || !tool) {
    return (
      <div className={styles.toolDetailError}>
        <h3>Error</h3>
        <p>{error || 'Failed to load tool details'}</p>
        <button 
          onClick={onClose}
          className={styles.closeButton}
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className={styles.toolDetailWrapper}>
      <div className={styles.toolDetailHeader}>
        <h2 className={styles.toolDetailTitle}>{tool.name}</h2>
        <button 
          onClick={onClose}
          className={styles.closeButton}
          aria-label="Close details"
        >
          &times;
        </button>
      </div>

      <div className={styles.toolDetailContent}>
        <div className={styles.toolDetailImage}>
          {tool.imageUrl && (
            <Image
              src={tool.imageUrl}
              alt={tool.name}
              width={200}
              height={200}
              className={styles.toolImage}
            />
          )}
        </div>

        <div className={styles.toolDetailInfo}>
          <div className={styles.toolDetailSection}>
            <h3>Description</h3>
            <p>{tool.description}</p>
          </div>

          <div className={styles.toolDetailSection}>
            <h3>Inputs</h3>
            <ul>
              {tool.inputs.map((input, index) => (
                <li key={`input-${index}`}>{input}</li>
              ))}
            </ul>
          </div>

          <div className={styles.toolDetailSection}>
            <h3>Processing</h3>
            <p>{tool.processing}</p>
          </div>

          <div className={styles.toolDetailSection}>
            <h3>Outputs</h3>
            <ul>
              {tool.outputs.map((output, index) => (
                <li key={`output-${index}`}>{output}</li>
              ))}
            </ul>
          </div>

          <div className={styles.toolDetailSection}>
            <h3>Implementation</h3>
            <p>{tool.implementation}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationToolDetail;