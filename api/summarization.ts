import express, { Request, Response, NextFunction } from 'express';
import axios, { AxiosResponse } from 'axios';

const router = express.Router();

// Define interfaces for request body types instead of extending the Request
interface SummarizeRequestBody {
  rawText: string;
}

interface ApproveSummaryRequestBody {
  summary: string;
}

// Helper function to get API configuration
const getApiConfig = () => {
  return {
    summarizationUrl: process.env.SUMMARIZATION_API_URL || 'https://api.summarization.ai/summarize',
    approvalUrl: process.env.APPROVAL_API_URL || 'https://api.summarization.ai/approve'
  };
};

// Endpoint to generate summary
router.post('/summarize', async (req: Request<{}, {}, SummarizeRequestBody>, res: Response, next: NextFunction) => {
  const { rawText } = req.body;

  // Validate input
  if (!rawText || typeof rawText !== 'string') {
    return res.status(400).json({ error: 'Invalid input: rawText must be a non-empty string' });
  }

  try {
    // Use the centralized API configuration
    const apiConfig = getApiConfig();
    const response: AxiosResponse = await axios.post(apiConfig.summarizationUrl, { text: rawText });
    res.json(response.data);
  } catch (error) {
    const err = error as Error;
    console.error('Summarization API error:', err.message);
    res.status(500).json({ error: 'Failed to generate summary', details: err.message });
  }
});

// Endpoint to approve summary
router.post('/approve-summary', async (req: Request<{}, {}, ApproveSummaryRequestBody>, res: Response, next: NextFunction) => {
  const { summary } = req.body;

  // Validate input
  if (!summary || typeof summary !== 'string') {
    return res.status(400).json({ error: 'Invalid input: summary must be a non-empty string' });
  }

  try {
    // Use the centralized API configuration
    const apiConfig = getApiConfig();
    const response: AxiosResponse = await axios.post(apiConfig.approvalUrl, { summary });
    res.json(response.data);
  } catch (error) {
    const err = error as Error;
    console.error('Summary approval API error:', err.message);
    res.status(500).json({ error: 'Failed to approve summary', details: err.message });
  }
});

export default router;