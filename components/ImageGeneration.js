import React, { useState } from 'react';
import axios from 'axios';

import React, { useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

const ImageGeneration = ({ context }) => {
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateImage = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/generate-image', { context });
      setImage(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const approveImage = async () => {
    setFeedback(null);
    setError(null);
    try {
      await axios.post('/api/approve-image', { image });
      setFeedback('Image approved successfully');
    } catch (err) {
      setError(err.message);
    }
  };

  const rejectImage = async () => {
    setFeedback(null);
    setError(null);
    try {
      await axios.post('/api/reject-image', { image });
      setFeedback('Image rejected successfully');
    } catch (err) {
      setError(err.message);
    }
  };

  const regenerateImage = async () => {
    setIsLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const response = await axios.post('/api/regenerate-image', { context });
      setImage(response.data);
      setFeedback('Image regenerated successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadImage = async (file) => {
    setIsLoading(true);
    setError(null);
    setFeedback(null);
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (file && !allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a JPEG, PNG, or GIF image.');
      setIsLoading(false);
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file && file.size > maxSize) {
      setError('File size too large. Maximum size is 5MB.');
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setImage(response.data);
      setFeedback('Image uploaded successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div aria-live="polite">
      <h3>Image Generation</h3>
      <button
        onClick={generateImage}
        aria-label="Generate image based on context"
        disabled={isLoading}
      >
        {isLoading ? 'Generating...' : 'Generate Image'}
      </button>
      {error && <p>Error: {error}</p>}
      {feedback && <p className="feedback-message">{feedback}</p>}
      {image && (
        <div>
          <img
            src={image.url}
            alt="AI generated based on context"
            onError={() => setError('Failed to load image')}
          />
          <button onClick={approveImage}>Approve Image</button>
          <button onClick={rejectImage}>Reject Image</button>
          <button onClick={regenerateImage}>Regenerate Image</button>
          <input
            type="file"
            accept="image/*"
            aria-label="Upload custom image"
            onChange={(e) => uploadImage(e.target.files[0])}
          />
          <p className="help-text">Upload a JPEG, PNG, or GIF image (max 5MB)</p>
        </div>
      )}
    </div>
  );
};

ImageGeneration.propTypes = {
  context: PropTypes.string.isRequired
};

export default ImageGeneration;
