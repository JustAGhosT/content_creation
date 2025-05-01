import { Request, Response, NextFunction, Router } from 'express';
import { authenticateUser } from './authenticationHelpers';
import { storeRecord } from './airtable-integration';
import featureFlags from './feature-flags';

interface Content {
  title: string;
  body: string;
}

interface User {
  id: string;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Ensure the inputCollection flag is defined
if (featureFlags.inputCollection === undefined) {
  console.warn('`inputCollection` feature flag is not defined; defaulting to false.');
  featureFlags.inputCollection = false;
}

async function storeContent(content: Content): Promise<string> {
  const record = await storeRecord('ContentTable', {
    title: content.title,
    body: content.body,
    createdAt: new Date().toISOString()
  });
  return record.id;
}

const router = Router();

// HTTP Endpoint for manual content submission
router.post('/submit-content', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
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

    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
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

router.use('/submit-content', authenticateUser);

export default router;
