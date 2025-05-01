import express, { Request, Response, NextFunction } from 'express';
import axios, { AxiosResponse } from 'axios';

const router = express.Router();

interface SummarizeRequest extends Request {
  body: {
    rawText: string;
  };
}

interface ApproveSummaryRequest extends Request {
  body: {
    summary: string;
  };
}

// Endpoint to generate summary
router.post('/summarize', async (req: SummarizeRequest, res: Response, next: NextFunction) => {
  const { rawText } = req.body;

  // Validate input
  if (!rawText || typeof rawText !== 'string') {
    return res.status(400).json({ error: 'Invalid input: rawText must be a non-empty string' });
  }

  try {
    // Simulate summarization API to generate concise summaries
    const SUMMARIZATION_API_URL: string = process.env.SUMMARIZATION_API_URL || 'https://api.summarization.ai/summarize';
    const response: AxiosResponse = await axios.post(SUMMARIZATION_API_URL, { text: rawText });
    res.json(response.data);
  } catch (error) {
    console.error('Summarization API error:', error.message);
    res.status(500).json({ error: 'Failed to generate summary', details: error.message });
  }
});

// Endpoint to approve summary
router.post('/approve-summary', async (req: ApproveSummaryRequest, res: Response, next: NextFunction) => {
  const { summary } = req.body;

  // Validate input
  if (!summary || typeof summary !== 'string') {
    return res.status(400).json({ error: 'Invalid input: summary must be a non-empty string' });
  }

  try {
    // Simulate approval process for the summary
    const APPROVAL_API_URL: string = process.env.APPROVAL_API_URL || 'https://api.summarization.ai/approve';
    const response: AxiosResponse = await axios.post(APPROVAL_API_URL, { summary });
    res.json(response.data);
  } catch (error) {
    console.error('Summary approval API error:', error.message);
    res.status(500).json({ error: 'Failed to approve summary', details: error.message });
  }
});

export default router;
