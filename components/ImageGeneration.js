import React, { useState } from 'react';
import axios from 'axios';

const ImageGeneration = ({ context }) => {
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);

  const generateImage = async () => {
    try {
      const response = await axios.post('/api/generate-image', { context });
      setImage(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const approveImage = async () => {
    try {
      const response = await axios.post('/api/approve-image', { image });
      console.log('Image approved:', response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const rejectImage = async () => {
    try {
      const response = await axios.post('/api/reject-image', { image });
      console.log('Image rejected:', response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const regenerateImage = async () => {
    try {
      const response = await axios.post('/api/regenerate-image', { context });
      setImage(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setImage(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <button onClick={generateImage}>Generate Image</button>
      {error && <p>Error: {error}</p>}
      {image && (
        <div>
          <img src={image.url} alt="Generated" />
          <button onClick={approveImage}>Approve Image</button>
          <button onClick={rejectImage}>Reject Image</button>
          <button onClick={regenerateImage}>Regenerate Image</button>
          <input
            type="file"
            onChange={(e) => uploadImage(e.target.files[0])}
          />
        </div>
      )}
    </div>
  );
};

export default ImageGeneration;
