import React, { useState } from 'react';
import { apiClient } from '../lib/api-client';

interface FeatureFlagToggleProps {
  featureName: string;
  initialState: boolean;
  implementation?: string;
  onToggle?: (newState: boolean) => void;
}

const FeatureFlagToggle: React.FC<FeatureFlagToggleProps> = ({
  featureName,
  initialState,
  implementation,
  onToggle
}) => {
  const [enabled, setEnabled] = useState<boolean>(initialState);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    try {
      setUpdating(true);
      setError(null);

      // Use the API client to update the feature flag
      await apiClient.updateFeatureFlag(featureName, !enabled, implementation);
      
      // Update local state
      setEnabled(!enabled);
      
      // Call the onToggle callback if provided
      if (onToggle) {
        onToggle(!enabled);
      }
    } catch (err: any) {
      setError(err.message || `Failed to update ${featureName}`);
      console.error(`Error updating feature flag ${featureName}:`, err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded mb-2">
      <div>
        <h3 className="font-medium">{featureName}</h3>
        <p className="text-sm text-gray-500">
          Status: <span className={enabled ? 'text-green-600' : 'text-red-600'}>
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
          {implementation && ` (${implementation})`}
        </p>
        {error && (
          <p className="text-sm text-red-600 mt-1">{error}</p>
        )}
      </div>
      <button
        onClick={handleToggle}
        disabled={updating}
        className={`px-4 py-2 rounded-md ${
          enabled
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
        } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {updating ? 'Updating...' : enabled ? 'Disable' : 'Enable'}
      </button>
    </div>
  );
};

export default FeatureFlagToggle;