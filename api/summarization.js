const express = require('express');
const router = express.Router();
const axios = require('axios');

// Endpoint to generate summary
router.post('/summarize', async (req, res) => {
  const { rawText } = req.body;

  // Validate input
  if (!rawText || typeof rawText !== 'string') {
    return res.status(400).json({ error: 'Invalid input: rawText must be a non-empty string' });
  }

  try {
    // Simulate summarization API to generate concise summaries
    const SUMMARIZATION_API_URL = process.env.SUMMARIZATION_API_URL || 'https://api.summarization.ai/summarize';
    const response = await axios.post(SUMMARIZATION_API_URL, { text: rawText });
    res.json(response.data);
  } catch (error) {
    console.error('Summarization API error:', error.message);
    res.status(500).json({ error: 'Failed to generate summary', details: error.message });
  }
});

// Endpoint to approve summary
router.post('/approve-summary', async (req, res) => {
  const { summary } = req.body;

  // Validate input
  if (!summary || typeof summary !== 'string') {
    return res.status(400).json({ error: 'Invalid input: summary must be a non-empty string' });
  }

  try {
    // Simulate approval process for the summary
    const APPROVAL_API_URL = process.env.APPROVAL_API_URL || 'https://api.summarization.ai/approve';
    const response = await axios.post(APPROVAL_API_URL, { summary });
    res.json(response.data);
  } catch (error) {
    console.error('Summary approval API error:', error.message);
    res.status(500).json({ error: 'Failed to approve summary', details: error.message });
  }
});

module.exports = router;
