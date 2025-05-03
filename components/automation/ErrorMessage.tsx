import React from 'react';
import styles from '../../styles/Automation.module.css';

interface ErrorMessageProps {
  message: string;
}

/**
 * Component for displaying error messages
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return (
    <div className={styles.error}>
      <p>{message}</p>
    </div>
  );
};

export default ErrorMessage;