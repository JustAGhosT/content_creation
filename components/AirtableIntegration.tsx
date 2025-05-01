import React, { useState, useEffect } from 'react';
import Airtable, { FieldSet, Records } from 'airtable';

interface Record {
  id: string;
  fields: {
    Name?: string;
  };
}

const AirtableIntegration: React.FC = () => {
  const [records, setRecords] = useState<Record[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const base = new Airtable({
          apiKey: process.env.REACT_APP_AIRTABLE_API_KEY
        }).base(process.env.REACT_APP_AIRTABLE_BASE_ID);
        const table = base(process.env.REACT_APP_AIRTABLE_TABLE_NAME);

        const records: Records<FieldSet> = await table.select().all();
        setRecords(records as Record[]);
      } catch (err) {
        setError((err as Error).message);
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
      {loading && <p>Loading records...</p>}
      {!loading && records.length === 0 && !error && <p>No records found</p>}
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
