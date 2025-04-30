import { storeRecord } from './airtable-integration.js';
import express from 'express';

// Ensure the featureFlags object exists
const featureFlags = global.featureFlags || {};

// Ensure the inputCollection flag is defined
if (featureFlags.inputCollection === undefined) {
  console.warn('`inputCollection` feature flag is not defined; defaulting to false.');
  featureFlags.inputCollection = false;
}
async function storeContent(content) {
  const record = await storeRecord('ContentTable', {
    title: content.title,
    body: content.body,
    createdAt: new Date().toISOString()
  });
  return record.id;
}

const router = express.Router();

// HTTP Endpoint for manual content submission
router.post('/submit-content', async (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }
  
  // Validate content structure and size
  if (typeof content !== 'object' || !content.title || !content.body) {
    return res.status(400).json({ error: 'Content must include title and body' });
  }
  
  if (content.body.length > 10000) { // Example size limit
    return res.status(400).json({ error: 'Content body exceeds maximum allowed size' });
  }

  try {

    // Check if the inputCollection feature flag is enabled
    if (!featureFlags.inputCollection) {
      return res.status(403).json({ error: 'Content submission is currently disabled' });
    }
    // Store the submitted content
    const contentId = await storeContent(content);
    console.log(`Content submitted and stored with ID: ${contentId}`);

    res.status(200).json({ 
      message: 'Content submitted successfully',
      contentId
    });
  } catch (error) {
    console.error('Failed to submit content:', error);
    res.status(500).json({ error: 'Failed to submit content' });
  }
});

// No duplicate helper function needed; already defined above

export default router;
