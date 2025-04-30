import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AuditTrail = () => {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await axios.get('/api/audit-logs');
        setLogs(response.data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchLogs();
  }, []);

  return (
    <div>
      <h2>Audit Trail</h2>
      {error && <p>Error: {error}</p>}
      <ul>
        {logs.map((log, index) => (
          <li key={index}>
            <strong>{log.timestamp}:</strong> {log.action} by {log.user}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AuditTrail;
