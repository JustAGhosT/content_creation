import React, { useState } from 'react';
import { apiClient, ApiError } from '../lib/api-client';

const ImageGenerator: React.FC = () => {
  const [context, setContext] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Generate image based on context
  const handleGenerateImage = async () => {
    if (!context.trim()) {
      setError('Please enter a description for the image');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await apiClient.generateImage(context);
      
      // Assuming the API returns a URL to the generated image
      setGeneratedImage(result.url);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to generate image');
      console.error('Error generating image:', apiError);
    } finally {
      setLoading(false);
    }
  };

  // Regenerate the image with the same context
  const handleRegenerateImage = async () => {
    if (!context.trim()) {
      setError('Please enter a description for the image');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Create an image object with the context for regeneration
      const image = { context };
      const result = await apiClient.reviewImage(image, 'regenerate');
      
      // Update the generated image
      setGeneratedImage(result.url);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to regenerate image');
      console.error('Error regenerating image:', apiError);
    } finally {
      setLoading(false);
    }
  };

  // Approve the generated image
  const handleApproveImage = async () => {
    if (!generatedImage) {
      setError('No image to approve');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Create an image object with the URL
      const image = { url: generatedImage, context };
      const result = await apiClient.reviewImage(image, 'approve');
      
      // Show success message
      alert('Image approved successfully!');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to approve image');
      console.error('Error approving image:', apiError);
    } finally {
      setLoading(false);
    }
  };

  // Reject the generated image
  const handleRejectImage = async () => {
    if (!generatedImage) {
      setError('No image to reject');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Create an image object with the URL
      const image = { url: generatedImage, context };
      const result = await apiClient.reviewImage(image, 'reject');
      
      // Reset the generated image
      setGeneratedImage(null);
      alert('Image rejected successfully!');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to reject image');
      console.error('Error rejecting image:', apiError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Image Generator</h1>
      
      {error && (
        <div className="p-2 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-1">
          Image Description
        </label>
        <textarea
          id="context"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Describe the image you want to generate..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          rows={4}
          disabled={loading}
        />
      </div>
      
      <div className="flex space-x-2 mb-6">
        <button
          onClick={handleGenerateImage}
          disabled={loading || !context.trim()}
          className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            loading || !context.trim() ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Generating...' : 'Generate Image'}
        </button>
        
        {generatedImage && (
          <button
            onClick={handleRegenerateImage}
            disabled={loading}
            className={`px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Regenerating...' : 'Regenerate'}
          </button>
        )}
      </div>
      
      {generatedImage && (
        <div className="border rounded-md p-4">
          <div className="mb-4">
            <img
              src={generatedImage}
              alt="Generated"
              className="w-full h-auto rounded-md"
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleApproveImage}
              disabled={loading}
              className={`px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Approve
            </button>
            
            <button
              onClick={handleRejectImage}
              disabled={loading}
              className={`px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGenerator;