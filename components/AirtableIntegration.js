import React, { useState, useEffect } from 'react';
import Airtable from 'airtable';

const AirtableIntegration = () => {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const base = new Airtable({
          apiKey: process.env.REACT_APP_AIRTABLE_API_KEY
        }).base(process.env.REACT_APP_AIRTABLE_BASE_ID);
        const table = base(process.env.REACT_APP_AIRTABLE_TABLE_NAME);

        const records = await table.select().all();
        setRecords(records);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, []);

  return (
    <div>
      <h2>Airtable Integration</h2>
      {error && <p>Error: {error}</p>}
      <ul>
        {records.map((record) => (
          <li key={record.id}>
            {(record.fields && record.fields.Name) || record.id || 'Unnamed record'}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AirtableIntegration;
