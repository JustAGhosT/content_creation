import React, { useState, useEffect } from 'react';
import { apiClient } from '../lib/api-client';

interface FeatureFlag {
  enabled: boolean;
  implementation?: string;
}

interface FeatureFlags {
  [key: string]: boolean | FeatureFlag;
  textParser: {
    enabled: boolean;
    implementation: 'deepseek' | 'openai' | 'azure';
  };
  imageGeneration: boolean;
  summarization: boolean;
  platformConnectors: boolean;
  multiPlatformPublishing: boolean;
  notificationSystem: boolean;
  feedbackMechanism: boolean;
}

const FeatureFlagsManager: React.FC = () => {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Fetch feature flags on component mount
  useEffect(() => {
    const fetchFeatureFlags = async () => {
      try {
        setLoading(true);
        const flags = await apiClient.getFeatureFlags();
        setFeatureFlags(flags);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch feature flags');
        console.error('Error fetching feature flags:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatureFlags();
  }, []);

  // Handle toggle feature flag
  const handleToggle = async (feature: string) => {
    if (!featureFlags) return;

    try {
      setUpdating(feature);
      setUpdateError(null);

      const currentFlag = featureFlags[feature];
      const isEnabled = typeof currentFlag === 'boolean' ? currentFlag : currentFlag.enabled;
      
      // For textParser, we need to include the implementation
      if (feature === 'textParser') {
        const implementation = (featureFlags.textParser as any).implementation;
        await apiClient.updateFeatureFlag(feature, !isEnabled, implementation);
      } else {
        await apiClient.updateFeatureFlag(feature, !isEnabled);
      }

      // Update local state
      setFeatureFlags((prev) => {
        if (!prev) return prev;
        
        if (typeof prev[feature] === 'boolean') {
          return { ...prev, [feature]: !prev[feature] };
        } else {
          return {
            ...prev,
            [feature]: {
              ...prev[feature],
              enabled: !(prev[feature] as FeatureFlag).enabled
            }
          };
        }
      });
    } catch (err: any) {
      setUpdateError(`Failed to update ${feature}: ${err.message}`);
      console.error(`Error updating ${feature}:`, err);
    } finally {
      setUpdating(null);
    }
  };

  // Handle implementation change for textParser
  const handleImplementationChange = async (implementation: 'deepseek' | 'openai' | 'azure') => {
    if (!featureFlags) return;

    try {
      setUpdating('textParser');
      setUpdateError(null);

      await apiClient.updateFeatureFlag(
        'textParser',
        featureFlags.textParser.enabled,
        implementation
      );

      // Update local state
      setFeatureFlags((prev) => {
        if (!prev) return prev;
        
        return {
          ...prev,
          textParser: {
            ...prev.textParser,
            implementation
          }
        };
      });
    } catch (err: any) {
      setUpdateError(`Failed to update textParser implementation: ${err.message}`);
      console.error('Error updating textParser implementation:', err);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return <div className="p-4">Loading feature flags...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        Error: {error}
      </div>
    );
  }

  if (!featureFlags) {
    return <div className="p-4">No feature flags found.</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Feature Flags Manager</h1>
      
      {updateError && (
        <div className="p-2 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {updateError}
        </div>
      )}
      
      <div className="space-y-4">
        {Object.entries(featureFlags).map(([feature, value]) => {
          const isComplex = typeof value === 'object';
          const isEnabled = isComplex ? value.enabled : value;
          
          return (
            <div key={feature} className="border p-4 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{feature}</h3>
                  <p className="text-gray-500">
                    Status: <span className={isEnabled ? 'text-green-600' : 'text-red-600'}>
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </p>
                </div>
                
                <button
                  onClick={() => handleToggle(feature)}
                  disabled={updating === feature}
                  className={`px-4 py-2 rounded ${
                    isEnabled
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  } ${updating === feature ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {updating === feature ? 'Updating...' : isEnabled ? 'Disable' : 'Enable'}
                </button>
              </div>
              
              {/* Special handling for textParser */}
              {feature === 'textParser' && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Implementation:
                  </label>
                  <select
                    value={(value as any).implementation}
                    onChange={(e) => handleImplementationChange(e.target.value as any)}
                    disabled={updating === 'textParser'}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="deepseek">DeepSeek</option>
                    <option value="openai">OpenAI</option>
                    <option value="azure">Azure</option>
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FeatureFlagsManager;