import React, { useState, useEffect } from 'react';
import PlatformConnectors from '../components/PlatformConnectors';
import AirtableIntegration from '../components/AirtableIntegration';

const PublishingQueuePage = () => {
  const [content, setContent] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch('/api/content');
        const data = await response.json();
        setContent(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchContent();
  }, []);

  return (
    <div>
      <h1>Pre-Publishing Queue</h1>
      {error && <p>Error: {error}</p>}
      <PlatformConnectors content={content} />
      <AirtableIntegration />
    </div>
  );
};

export default PublishingQueuePage;
