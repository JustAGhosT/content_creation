import React from 'react';
import styles from '../../styles/shared.module.css';

interface ContentHeaderProps {
  title: string;
  subtitle: string;
}

const ContentHeader: React.FC<ContentHeaderProps> = ({ title, subtitle }) => {
  return (
    <div className={styles.header}>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
};

export default ContentHeader;