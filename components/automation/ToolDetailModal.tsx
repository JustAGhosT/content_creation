import React from 'react';
import dynamic from 'next/dynamic';
import styles from '../../styles/Automation.module.css';

// Dynamic import for the AutomationToolDetail component
const AutomationToolDetail = dynamic(
  () => import('../AutomationToolDetail'),
  {
    loading: () => <p className={styles.loadingComponent}>Loading tool details...</p>,
    ssr: true,
  }
);

interface ToolDetailModalProps {
  toolId: string;
  onClose: () => void;
}

/**
 * Component for displaying a modal with detailed information about a tool
 */
const ToolDetailModal: React.FC<ToolDetailModalProps> = ({ toolId, onClose }) => {
  return (
    <div className={styles.toolDetailModal} onClick={onClose}>
      <div className={styles.toolDetailContent} onClick={(e) => e.stopPropagation()}>
        <AutomationToolDetail 
          toolId={toolId} 
          onClose={onClose}
        />
      </div>
    </div>
  );
};

export default ToolDetailModal;