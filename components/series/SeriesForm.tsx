import React, { useState } from 'react';
import styles from '../../styles/Series.module.css';
import { Series } from '../../types/series';

interface SeriesFormProps {
  onAddSeries: (newSeries: Series) => void;
}

const SeriesForm: React.FC<SeriesFormProps> = ({ onAddSeries }) => {
  const initialFormState: Series = {
    title: '',
    description: '',
    topics: [],
    targetAudience: '',
    estimatedArticles: 0,
    publishFrequency: 'monthly',
    status: 'planning'
  };

  const [formData, setFormData] = useState<Series>(initialFormState);
  const [topicInput, setTopicInput] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Handle input changes for text fields
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  // Handle adding topics
  const handleAddTopic = () => {
    if (topicInput.trim()) {
      setFormData({
        ...formData,
        topics: [...formData.topics, topicInput.trim()]
      });
      setTopicInput('');
    }
  };

  // Handle removing topics
  const handleRemoveTopic = (indexToRemove: number) => {
    setFormData({
      ...formData,
      topics: formData.topics.filter((_, index) => index !== indexToRemove)
    });
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (formData.estimatedArticles <= 0) {
      newErrors.estimatedArticles = 'Number of articles must be greater than 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // In a real app, you might save to an API here
      // await saveSeriesAPI(formData);
      
      // Add the new series to the list
      onAddSeries(formData);
      
      // Reset form after successful submission
      setFormData(initialFormState);
    } catch (error) {
      console.error('Error saving series:', error);
      setErrors({ 
        submit: 'Failed to save series. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.formTitle}>Create New Series</h2>
      
      {errors.submit && (
        <div className={styles.errorMessage}>{errors.submit}</div>
      )}
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="title">Series Title</label>
          <input
            id="title"
            name="title"
            type="text"
            value={formData.title}
            onChange={handleInputChange}
            className={`${styles.formInput} ${errors.title ? styles.inputError : ''}`}
            placeholder="e.g., Advanced System Architecture"
            disabled={isSubmitting}
          />
          {errors.title && <div className={styles.errorText}>{errors.title}</div>}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className={`${styles.formTextarea} ${errors.description ? styles.inputError : ''}`}
            placeholder="Describe the purpose and scope of this series..."
            rows={4}
            disabled={isSubmitting}
          />
          {errors.description && <div className={styles.errorText}>{errors.description}</div>}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="topics">Topics</label>
          <div className={styles.topicInputGroup}>
            <input
              id="topicInput"
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              className={styles.formInput}
              placeholder="Add a topic"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={handleAddTopic}
              className={styles.addTopicButton}
              disabled={isSubmitting || !topicInput.trim()}
            >
              Add
            </button>
          </div>
          
          {formData.topics.length > 0 && (
            <div className={styles.topicsList}>
              {formData.topics.map((topic, index) => (
                <div key={index} className={styles.topicTag}>
                  {topic}
                  <button
                    type="button"
                    onClick={() => handleRemoveTopic(index)}
                    className={styles.removeTopicButton}
                    disabled={isSubmitting}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="targetAudience">Target Audience</label>
            <input
              id="targetAudience"
              name="targetAudience"
              type="text"
              value={formData.targetAudience}
              onChange={handleInputChange}
              className={styles.formInput}
              placeholder="e.g., Senior Developers"
              disabled={isSubmitting}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="estimatedArticles">Number of Articles</label>
            <input
              id="estimatedArticles"
              name="estimatedArticles"
              type="number"
              value={formData.estimatedArticles || ''}
              onChange={handleInputChange}
              className={`${styles.formInput} ${errors.estimatedArticles ? styles.inputError : ''}`}
              min="1"
              disabled={isSubmitting}
            />
            {errors.estimatedArticles && <div className={styles.errorText}>{errors.estimatedArticles}</div>}
          </div>
        </div>
        
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="publishFrequency">Publish Frequency</label>
            <select
              id="publishFrequency"
              name="publishFrequency"
              value={formData.publishFrequency}
              onChange={handleInputChange}
              className={styles.formSelect}
              disabled={isSubmitting}
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className={styles.formSelect}
              disabled={isSubmitting}
            >
              <option value="planning">Planning</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
            </select>
          </div>
        </div>
        
        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Series'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SeriesForm;