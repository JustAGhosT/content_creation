import React, { useState } from 'react';
import axios, { AxiosResponse } from 'axios';

interface ImageGenerationProps {
  context: string;
}

interface ImageResponse {
  data: {
    url?: string;
    id?: string;
    // Add other specific properties from your API response
  };
}

const ImageGeneration: React.FC<ImageGenerationProps> = ({ context }) => {
  const [image, setImage] = useState<ImageResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const generateImage = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response: AxiosResponse<ImageResponse> = await axios.post('/api/generate-image', { context });
      setImage(response.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const approveImage = async () => {
    setIsLoading(true);
    setFeedback(null);
    setError(null);
    try {
      await axios.post('/api/approve-image', { image });
      setFeedback('Image approved successfully');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const rejectImage = async () => {
    setFeedback(null);
    setError(null);
    try {
      await axios.post('/api/reject-image', { image });
      setFeedback('Image rejected successfully');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const regenerateImage = async () => {
    setIsLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const response: AxiosResponse<ImageResponse> = await axios.post('/api/regenerate-image', { context });
      setImage(response.data);
      setFeedback('Image regenerated successfully');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadImage = async (file: File) => {
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
      const response: AxiosResponse<ImageResponse> = await axios.post('/api/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setImage(response.data);
      setFeedback('Image uploaded successfully');
    } catch (err: any) {
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
      {isLoading && <p>Loading...</p>}
      {feedback && <p className="feedback-message">{feedback}</p>}
      {image && (
        <div>
          <button onClick={approveImage} disabled={isLoading}>
            Approve Image
          </button>
          <button onClick={rejectImage} disabled={isLoading}>
            Reject Image
          </button>
          <button onClick={regenerateImage} disabled={isLoading}>
            {isLoading ? 'Regenerating...' : 'Regenerate Image'}
          </button>
          <input
            type="file"
            accept="image/*"
            aria-label="Upload custom image"
            onChange={(e) => e.target.files && e.target.files.length > 0 && uploadImage(e.target.files[0])}
            disabled={isLoading}
          />
          <p className="help-text">Upload a JPEG, PNG, or GIF image (max 5MB)</p>
        </div>
      )}
    </div>
  );
}

export default ImageGeneration;
