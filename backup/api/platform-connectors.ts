import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  getPlatformConfig,
  Platform,
  platforms
} from '../config/platforms';

// Define content structure
interface ContentType {
  id?: string;
  title?: string;
  description?: string;
  // Add other relevant fields
}

interface QueueItem {
  platform: Platform;
  content: ContentType;
}

interface PublishResult {
  item: QueueItem;
  error?: string;
}

// Handler for the approve-queue endpoint
export async function approveQueue(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
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

// Handler for the platforms endpoint
export function getPlatforms(_req: NextApiRequest, res: NextApiResponse) {
  res.json(platforms);
}

// Handler for the platform capabilities endpoint
export function getPlatformCapabilities(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const platformId = parseInt(id as string);
  
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
}

// Main handler function that routes to the appropriate handler based on the request
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query } = req;
  
  // Route to the appropriate handler based on the path and method
  if (req.url?.endsWith('/approve-queue') && method === 'POST') {
    return approveQueue(req, res);
  } else if (req.url?.endsWith('/platforms') && method === 'GET') {
    return getPlatforms(req, res);
  } else if (req.url?.includes('/platforms/') && req.url?.includes('/capabilities') && method === 'GET') {
    return getPlatformCapabilities(req, res);
  }
  
  // If no route matches, return 404
  return res.status(404).json({ message: 'Not found' });
}
