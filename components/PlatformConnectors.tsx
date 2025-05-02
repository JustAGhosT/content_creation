import axios from 'axios';
import React, { useEffect, useState } from 'react';

interface Platform {
  id: number;
  name: string;
}

// New specific interface for content
interface ContentItem {
  id: string;
  title: string;
  description: string;
  body: string;
  metadata: {
    tags?: string[];
    publishDate?: string;
    author?: string;
    [key: string]: any; // For any additional metadata fields
  };
}

interface QueueItem {
  platform: Platform;
  content: ContentItem;
}

interface PlatformConnectorsProps {
  content: ContentItem;
}

const PlatformConnectors: React.FC<PlatformConnectorsProps> = ({ content }) => {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlatforms = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get('/api/platforms');
        setPlatforms(response.data);
      } catch (err) {
        const errorMessage = axios.isAxiosError(err) 
          ? err.response?.data?.message || err.message 
          : 'An unexpected error occurred';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlatforms();
  }, []);

  const addToQueue = (platform: Platform) => {
    if (!content || Object.keys(content).length === 0) {
      setError('Cannot add to queue: No valid content available');
      return;
    }
    setQueue([...queue, { platform, content }]);
  };

  const removeFromQueue = (index: number) => {
    const updatedQueue = queue.filter((_, i) => i !== index);
    setQueue(updatedQueue);
  };

  const approveQueue = async () => {
    if (queue.length === 0) {
      setError('Cannot approve an empty queue');
      return;
    }

    setIsApproving(true);
    setError(null);
    setApprovalMessage(null);

    try {
      const response = await axios.post('/api/approve-queue', { queue });
      setApprovalMessage('Queue successfully approved!');
      setQueue([]); // Clear the queue after successful approval
    } catch (err) {
      const errorMessage = axios.isAxiosError(err) 
        ? err.response?.data?.message || err.message 
        : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div>
      <h2>Platform Connectors</h2>
      {error && <p>Error: {error}</p>}
      {approvalMessage && <p className="success-message">{approvalMessage}</p>}
      <div>
        <h3>Available Platforms</h3>
        {isLoading ? (
          <p>Loading platforms...</p>
        ) : (
          <ul>
            {platforms.map((platform) => (
              <li key={platform.id}>
                {platform.name}
                <button onClick={() => addToQueue(platform)}>Add to Queue</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3>Pre-Publishing Queue</h3>
        <ul>
          {queue.map((item, index) => (
            <li key={index}>
              {item.platform.name}
              <button onClick={() => removeFromQueue(index)}>Remove</button>
            </li>
          ))}
        </ul>
        <button 
          onClick={approveQueue} 
          disabled={queue.length === 0 || isApproving}
        >
          {isApproving ? 'Processing...' : 'Approve Queue'}
        </button>
      </div>
    </div>
  );
};
export default PlatformConnectors;
