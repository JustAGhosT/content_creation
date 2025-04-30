import React, { useState, useEffect } from 'react';
import Airtable from 'airtable';

const AirtableIntegration = () => {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
        const table = base(process.env.AIRTABLE_TABLE_NAME);

        const records = await table.select().all();
        setRecords(records);
      } catch (err) {
        setError(err.message);
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
          <li key={record.id}>{record.fields.Name}</li>
        ))}
      </ul>
    </div>
  );
};

export default AirtableIntegration;
