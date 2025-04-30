import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PlatformConnectors = ({ content }) => {
  const [platforms, setPlatforms] = useState([]);
  const [queue, setQueue] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch available platforms
    const fetchPlatforms = async () => {
      try {
        const response = await axios.get('/api/platforms');
        setPlatforms(response.data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchPlatforms();
  }, []);

  const addToQueue = (platform) => {
    setQueue([...queue, { platform, content }]);
  };

  const removeFromQueue = (index) => {
    const updatedQueue = queue.filter((_, i) => i !== index);
    setQueue(updatedQueue);
  };

  const approveQueue = async () => {
    try {
      const response = await axios.post('/api/approve-queue', { queue });
      console.log('Queue approved:', response.data);
    } catch (err) {
      setError(err.message);
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
