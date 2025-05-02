import React, { useState, useEffect } from 'react';
import { apiClient } from '../lib/api-client';

interface Platform {
  id: number;
  name: string;
  icon: string;
}

interface PlatformSelectorProps {
  onSelect: (platform: Platform) => void;
  selectedPlatformId?: number;
}

const PlatformSelector: React.FC<PlatformSelectorProps> = ({ onSelect, selectedPlatformId }) => {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch platforms using the API client
    const fetchPlatforms = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use the API client instead of direct fetch/axios calls
        const data = await apiClient.getPlatforms();
        setPlatforms(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load platforms');
        console.error('Error fetching platforms:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlatforms();
  }, []);

  // Handle platform selection
  const handlePlatformSelect = (platform: Platform) => {
    onSelect(platform);
  };

  if (loading) {
    return <div className="p-4 text-center">Loading platforms...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        Error: {error}
      </div>
    );
  }

  if (platforms.length === 0) {
    return <div className="p-4 text-center">No platforms available.</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-medium mb-4">Select a Platform</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {platforms.map((platform) => (
          <div
            key={platform.id}
            className={`p-4 border rounded cursor-pointer transition-colors ${
              selectedPlatformId === platform.id
                ? 'bg-blue-100 border-blue-500'
                : 'hover:bg-gray-50'
            }`}
            onClick={() => handlePlatformSelect(platform)}
          >
            <div className="flex flex-col items-center">
              {platform.icon && (
                <img
                  src={platform.icon}
                  alt={`${platform.name} icon`}
                  className="w-8 h-8 mb-2"
                />
              )}
              <span className="text-center">{platform.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlatformSelector;