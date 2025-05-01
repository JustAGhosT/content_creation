import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { withAuth } from '../../middleware/withAuth';
import { getPlatformConfig } from '../../config/platforms';
import { QueueItem, PublishResult } from '../../types';
import featureFlags from '../../utils/featureFlags';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Check if platform connectors feature is enabled
  if (!featureFlags.platformConnectors) {
    return res.status(403).json({ message: 'Platform connectors feature is disabled' });
  }

  const { queue } = req.body as { queue: QueueItem[] };
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
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

export default withAuth(handler);