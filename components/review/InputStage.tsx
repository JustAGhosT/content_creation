import React from 'react';
import styles from '../../styles/HumanReview.module.css';

interface InputStageProps {
  rawInput: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  isDisabled: boolean;
}

/**
 * Component for the initial input stage of the review process
 */
const InputStage: React.FC<InputStageProps> = ({
  rawInput,
  onChange,
  onSubmit,
  isDisabled
}) => {
  return (
    <div className={styles.inputStage}>
      <h2>Input Raw Content</h2>
      <textarea
        className={styles.inputTextarea}
        value={rawInput}
        onChange={onChange}
        placeholder="Enter raw input here"
        disabled={isDisabled}
      />
      <div className={styles.actionButtons}>
        <button
          className={styles.primaryButton}
          onClick={onSubmit}
          disabled={isDisabled || !rawInput}
        >
          Parse Text
        </button>
      </div>
    </div>
  );
};

export default InputStage;