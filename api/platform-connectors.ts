import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';

const router = express.Router();

interface Platform {
  id: number;
  name: string;
}

interface QueueItem {
  platform: Platform;
  content: string;
}

interface PlatformConfig {
  apiUrl: string;
  apiKey: string;
  headers?: Record<string, string>;
}

interface PublishResult {
  item: QueueItem;
  error?: string;
}

const platforms: Platform[] = [
  { id: 1, name: 'Facebook' },
  { id: 2, name: 'Instagram' },
  { id: 3, name: 'LinkedIn' },
  { id: 4, name: 'Twitter' },
  { id: 5, name: 'Custom Channel' }
];

const platformConfigurations: Record<string, PlatformConfig> = {
  facebook: {
    apiUrl: 'https://api.facebook.com/publish',
    apiKey: process.env.FACEBOOK_API_KEY || '',
  },
  'custom channel': {
    apiUrl: 'https://api.customchannel.com/publish',
    apiKey: process.env.CUSTOM_CHANNEL_API_KEY || '',
    headers: { 'Authorization': `Bearer ${process.env.CUSTOM_CHANNEL_API_KEY}` }
  }
};

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

      const platformConfig = platformConfigurations[item.platform.name.toLowerCase()];
      if (!platformConfig) {
        results.failed.push({ item, error: 'Platform configuration not found' });
        continue;
      }

      try {
        await axios.post(platformConfig.apiUrl, {
          content: item.content
        }, {
          headers: {
            ...platformConfig.headers,
            'Authorization': `Bearer ${platformConfig.apiKey}`
          }
        });
        results.success.push(item);
      } catch (err) {
        results.failed.push({ item, error: (err as Error).message });
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

router.get('/platforms', (req: Request, res: Response) => {
  res.json(platforms);
});

export default router;
