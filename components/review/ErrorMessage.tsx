import React from 'react';
import styles from '../../styles/HumanReview.module.css';

interface ErrorMessageProps {
  message: string;
}

/**
 * Component for displaying error messages
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return (
    <div className={styles.errorMessage}>
      <p>Error: {message}</p>
    </div>
  );
};

export default ErrorMessage;