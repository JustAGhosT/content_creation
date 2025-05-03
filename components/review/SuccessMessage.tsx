import React from 'react';
import Image from 'next/image';
import styles from '../../styles/HumanReview.module.css';

interface SuccessMessageProps {
  message: string;
}

/**
 * Component for displaying success messages after content approval
 */
const SuccessMessage: React.FC<SuccessMessageProps> = ({ message }) => {
  return (
    <div className={styles.successMessage}>
      <Image 
        src="/images/success-check.svg"
        alt="Success"
        width={30}
        height={30}
        priority
      />
      <p>{message}</p>
    </div>
  );
};

export default SuccessMessage;