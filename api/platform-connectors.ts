import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { 
  platforms, 
  getPlatformConfig, 
  Platform, 
  PlatformConfig 
} from '../config/platforms';

const router = express.Router();

interface QueueItem {
  platform: Platform;
  content: string;
}

interface PublishResult {
  item: QueueItem;
  error?: string;
}

router.post('/approve-queue', async (req: Request, res: Response, next: NextFunction) => {
  const { queue }: { queue: QueueItem[] } = req.body;

  if (!Array.isArray(queue) || !queue.length) {
    return res.status(400).json({ message: 'Queue must be a non-empty array' });
  }

  const results: { success: QueueItem[]; failed: PublishResult[] } = { success: [], failed: [] };

  try {
    for (const item of queue) {
      if (!item.platform || !item.platform.name || !item.content) {
        results.failed.push({ item, error: 'Invalid item structure' });
        continue;
      }

      const platformName = item.platform.name.toLowerCase();
      const platformConfig = getPlatformConfig(platformName);
      
      if (!platformConfig) {
        results.failed.push({ item, error: `Platform configuration not found for ${platformName}` });
        continue;
      }

      // Check if API key is missing for a required platform
      if (platformConfig.required && !platformConfig.apiKey) {
        results.failed.push({ 
          item, 
          error: `API key for ${platformName} is not configured. Please set the ${platformName.toUpperCase().replace(/\s+/g, '_')}_API_KEY environment variable.` 
        });
        continue;
      }

      try {
        await axios.post(platformConfig.apiUrl, {
          content: item.content
        }, {
          headers: {
            ...platformConfig.headers,
            'Authorization': platformConfig.headers?.Authorization || `Bearer ${platformConfig.apiKey}`
          }
        });
        results.success.push(item);
      } catch (err) {
        const error = err as Error;
        // Add more context to the error if it might be API key related
        const errorMessage = !platformConfig.apiKey 
          ? `${error.message} (This may be due to missing API key)`
          : error.message;
        
        results.failed.push({ item, error: errorMessage });
      }
    }

    if (results.failed.length === 0) {
      res.status(200).json({ message: 'Queue approved and published successfully', results });
    } else if (results.success.length === 0) {
      res.status(500).json({ message: 'All publishing attempts failed', results });
    } else {
      res.status(207).json({ message: 'Some items published successfully', results });
    }
  } catch (error) {
    next(error);
  }
});

router.get('/platforms', (_req: Request, res: Response) => {
  res.json(platforms);
});

// New endpoint to get platform capabilities
router.get('/platforms/:id/capabilities', (req: Request, res: Response) => {
  const platformId = parseInt(req.params.id);
  
  if (isNaN(platformId)) {
    return res.status(400).json({ message: 'Invalid platform ID' });
  }
  
  const platform = platforms.find(p => p.id === platformId);
  
  if (!platform) {
    return res.status(404).json({ message: 'Platform not found' });
  }
  
  const config = getPlatformConfig(platform.name);
  
  if (!config) {
    return res.status(404).json({ message: 'Platform configuration not found' });
  }
  
  res.json({
    platform,
    capabilities: config.capabilities || []
  });
});

export default router;