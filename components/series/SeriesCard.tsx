import React, { useState } from 'react';
import styles from '../../styles/Series.module.css';
import { Series } from '../../types/series';

interface SeriesCardProps {
  series: Series;
  index: number;
  onEdit: (index: number, updatedSeries: Series) => void;
  onDelete: (index: number) => void;
}

const SeriesCard: React.FC<SeriesCardProps> = ({ 
  series, 
  index, 
  onEdit, 
  onDelete 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSeries, setEditedSeries] = useState<Series>(series);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedSeries({ ...editedSeries, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onEdit(index, editedSeries);
    setIsEditing(false);
  };

  return (
    <div className={styles.seriesCard}>
      {isEditing ? (
        <form onSubmit={handleSubmit} className={styles.editForm}>
          <div className={styles.formGroup}>
            <label htmlFor={`title-${index}`}>Title</label>
            <input
              id={`title-${index}`}
              name="title"
              type="text"
              value={editedSeries.title}
              onChange={handleInputChange}
              required
              className={styles.formInput}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor={`description-${index}`}>Description</label>
            <textarea
              id={`description-${index}`}
              name="description"
              value={editedSeries.description}
              onChange={handleInputChange}
              required
              className={styles.formTextarea}
            />
          </div>
          
          {/* Additional fields can be added here */}
          
          <div className={styles.formActions}>
            <button 
              type="button" 
              onClick={() => setIsEditing(false)}
              className={styles.secondaryButton}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className={styles.primaryButton}
            >
              Save Changes
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className={styles.seriesContent}>
            <h2 className={styles.seriesTitle}>{series.title}</h2>
            <p className={styles.seriesDescription}>{series.description}</p>
            
            {/* Display additional series properties here */}
            {series.topics && (
              <div className={styles.topicsList}>
                <h3>Topics:</h3>
                <ul>
                  {series.topics.map((topic: string, i: number) => (
                    <li key={i}>{topic}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className={styles.seriesActions}>
            <button 
              onClick={() => setIsEditing(true)}
              className={styles.editButton}
            >
              Edit
            </button>
            <button 
              onClick={() => onDelete(index)}
              className={styles.deleteButton}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SeriesCard;