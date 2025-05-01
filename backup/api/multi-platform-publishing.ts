import express, { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import winston from 'winston';
import axios, { AxiosInstance } from 'axios';
import { verifyJwt } from '../auth';
import featureFlags from './feature-flags';

const router = express.Router();

// Initialize error tracking
Sentry.init({ dsn: process.env.SENTRY_DSN });
const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

// Create platform API clients
const createApiClient = (baseUrl: string, apiKey: string): AxiosInstance =>
  axios.create({
    baseURL: baseUrl,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

const platformConfigs: { [key: string]: { url: string; key: string } } = {
  facebook: { url: process.env.FACEBOOK_API_URL, key: process.env.FACEBOOK_API_KEY },
  instagram: { url: process.env.INSTAGRAM_API_URL, key: process.env.INSTAGRAM_API_KEY },
  linkedin: { url: process.env.LINKEDIN_API_URL, key: process.env.LINKEDIN_API_KEY },
  twitter: { url: process.env.TWITTER_API_URL, key: process.env.TWITTER_API_KEY },
  custom: { url: process.env.CUSTOM_API_URL, key: process.env.CUSTOM_API_KEY },
};

const apiClients: { [key: string]: AxiosInstance } = {};
for (const [platform, cfg] of Object.entries(platformConfigs)) {
  if (cfg.url && cfg.key) {
    apiClients[platform] = createApiClient(cfg.url, cfg.key);
  }
}

// Whitelist valid platform keys
const validPlatforms = Object.keys(platformConfigs);

// In-memory publishing queue for MVP/simulation
if (!global.publishingQueue) {
  global.publishingQueue = [];
}

// Protect all routes
router.use(verifyJwt);

// Publish content immediately
router.post('/publish-content', async (req: Request, res: Response, next: NextFunction) => {
  const { content, platforms }: { content: string; platforms: string[] } = req.body;
  try {
    if (!featureFlags.platformConnectors) {
      return res.status(400).json({ error: 'Platform connectors are disabled' });
    }
    if (!content || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ error: 'Invalid content or platforms' });
    }
    for (const platform of platforms) {
      const key = platform.toLowerCase();
      if (!validPlatforms.includes(key)) {
        return res.status(400).json({ error: `Invalid platform: ${platform}` });
      }
      if (!featureFlags.platformConnectors[key]) {
        return res.status(400).json({ error: `Platform ${platform} is not enabled` });
      }
      await apiClients[key].post('/publish', { content });
    }
    res.status(200).json({ message: 'Content published successfully' });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
    next(err);
  }
});

// Add to queue
router.post('/add-to-queue', async (req: Request, res: Response, next: NextFunction) => {
  const { content, platforms }: { content: string; platforms: string[] } = req.body;
  if (!content || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
    return res.status(400).json({ error: 'Invalid content or platforms' });
  }
  try {
    const queueItem = { id: Date.now(), content, platforms, status: 'pending', createdAt: new Date() };
    global.publishingQueue.push(queueItem);
    logger.info(`Added item ${queueItem.id} to queue with ${platforms.length} platforms`);
    // Log for debugging as in the improvement
    console.log('Content added to queue:', { content, platforms });
    res.status(200).json({ message: 'Content added to queue successfully' });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
    next(err);
  }
});

// Approve and publish queue
router.post('/approve-queue', async (req: Request, res: Response, next: NextFunction) => {
  const { queue }: { queue: { id: number; platform: string; content: string }[] } = req.body;
  if (!queue || !Array.isArray(queue) || queue.length === 0) {
    return res.status(400).json({ error: 'Invalid queue data' });
  }
  try {
    if (!featureFlags.platformConnectors) {
      return res.status(400).json({ error: 'Platform connectors are not enabled' });
    }
    for (const item of queue) {
      if (!item.platform || !item.content) {
        return res.status(400).json({ error: 'Invalid queue item: missing platform or content' });
      }
      const platformKey = item.platform.toLowerCase();
      if (!validPlatforms.includes(platformKey)) {
        return res.status(400).json({ error: `Invalid platform: ${item.platform}` });
      }
      const platformEnabled = featureFlags.enabledPlatforms?.[platformKey] ?? true;
      if (!platformEnabled) {
        return res.status(400).json({ error: `Platform ${item.platform} is not enabled` });
      }
      await apiClients[platformKey].post('/publish', { content: item.content });
    }
    // Optionally update queue items status in in-memory store
    if (global.publishingQueue) {
      const queueIds = queue.map(item => item.id);
      global.publishingQueue = global.publishingQueue.map(item =>
        queueIds.includes(item.id) ? { ...item, status: 'published', publishedAt: new Date() } : item
      );
    }
    res.status(200).json({ message: 'Queue approved and content published' });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
    next(err);
  }
});

// Global error handler
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ error: 'Internal server error' });
});

export default router;
