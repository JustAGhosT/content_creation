import React, { useState } from 'react';
import { apiClient } from '../lib/api-client';

interface ImageGenerationFormProps {
  onImageGenerated?: (imageUrl: string) => void;
}

const ImageGenerationForm: React.FC<ImageGenerationFormProps> = ({ onImageGenerated }) => {
  const [prompt, setPrompt] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      setError('Please enter a description for the image');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Use the API client to generate an image
      const result = await apiClient.generateImage(prompt);
      
      if (result && result.url) {
        setGeneratedImage(result.url);
        
        // Call the callback if provided
        if (onImageGenerated) {
          onImageGenerated(result.url);
        }
      } else {
        setError('Failed to generate image: Invalid response format');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate image');
      console.error('Error generating image:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description for the image');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Use the API client to regenerate the image
      const image = { context: prompt };
      const result = await apiClient.reviewImage(image, 'regenerate');
      
      if (result && result.url) {
        setGeneratedImage(result.url);
        
        // Call the callback if provided
        if (onImageGenerated) {
          onImageGenerated(result.url);
        }
      } else {
        setError('Failed to regenerate image: Invalid response format');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate image');
      console.error('Error regenerating image:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 border rounded-lg">
      <h2 className="text-xl font-bold mb-4">Generate Image</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
            Image Description
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder="Describe the image you want to generate..."
            disabled={loading}
          />
        </div>
        
        <div className="flex space-x-2">
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              loading || !prompt.trim() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Generating...' : 'Generate Image'}
          </button>
          
          {generatedImage && (
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={loading}
              className={`px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Regenerate
            </button>
          )}
        </div>
      </form>
      
      {generatedImage && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Generated Image</h3>
          <img 
            src={generatedImage} 
            alt="Generated from description" 
            className="w-full h-auto rounded-md border"
          />
        </div>
      )}
    </div>
  );
};

export default ImageGenerationForm;