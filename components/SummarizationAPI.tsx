import React, { useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

interface SummarizationAPIProps {
  rawText: string;
}

const SummarizationAPI: React.FC<SummarizationAPIProps> = ({ rawText }) => {
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);

  const generateSummary = async () => {
    if (!rawText || rawText.trim() === '') {
      setError('Raw text cannot be empty');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/summarize', { rawText });
      setSummary(response.data);
      setApprovalStatus(null); // Reset approval status on new summary
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const approveSummary = async () => {
    if (!summary) {
      setError('No summary to approve');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await axios.post('/api/approve-summary', { summary });
      setApprovalStatus('approved');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={generateSummary}
        disabled={loading || !rawText || rawText.trim() === ''}
      >
        {loading ? 'Generating...' : 'Generate Summary'}
      </button>
      {error && <p>Error: {error}</p>}
      {summary && (
        <div>
          <pre>{JSON.stringify(summary, null, 2)}</pre>
          <button
            onClick={approveSummary}
            disabled={loading || approvalStatus === 'approved'}
          >
            {loading && approvalStatus !== 'approved'
              ? 'Approving...'
              : approvalStatus === 'approved'
              ? 'Approved'
              : 'Approve Summary'}
          </button>
        </div>
      )}
    </div>
  );
};

SummarizationAPI.propTypes = {
  rawText: PropTypes.string.isRequired
};

SummarizationAPI.defaultProps = {
  rawText: ''
};

export default SummarizationAPI;
