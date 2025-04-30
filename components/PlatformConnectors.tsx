import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Platform {
  id: number;
  name: string;
}

interface QueueItem {
  platform: Platform;
  content: any;
}

interface PlatformConnectorsProps {
  content: any;
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
        const errorMessage = err.response?.data?.message || err.message;
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
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div>
      <h2>Platform Connectors</h2>
      {error && <p>Error: {error}</p>}
      <div>
        <h3>Available Platforms</h3>
        <ul>
          {platforms.map((platform) => (
            <li key={platform.id}>
              {platform.name}
              <button onClick={() => addToQueue(platform)}>Add to Queue</button>
            </li>
          ))}
        </ul>
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
        <button onClick={approveQueue}>Approve Queue</button>
      </div>
    </div>
  );
};

export default PlatformConnectors;
