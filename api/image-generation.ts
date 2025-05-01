import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { imageGeneration } from './feature-flags';
import HuggingFaceClient from './huggingface-client';
import jwt from 'jsonwebtoken';

const router = Router();
const huggingFaceClient = new HuggingFaceClient();

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

// Authentication middleware
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const user = jwt.verify(token, process.env.JWT_SECRET as string);
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Simple validation middleware
const validate = (schema: (body: any) => { error?: string }) => (req: Request, res: Response, next: NextFunction) => {
  const { error } = schema(req.body);
  if (error) {
    return res.status(400).json({ error: error.toString() });
  }
  next();
};

// Validation schemas
const validateContext = (body: any) => {
  if (!body || typeof body.context !== 'string' || !body.context.trim()) {
    return { error: 'Context is required and must be a non-empty string' };
  }
  return {};
};
const validateImage = (body: any) => {
  if (!body || typeof body.image !== 'object' || !body.image) {
    return { error: 'Invalid image data provided' };
  }
  return {};
};
const validateFile = (body: any) => {
  if (!body || !body.file) {
    return { error: 'File is required' };
  }
  return {};
};
const validateReview = (body: any) => {
  if (!body || !body.image || !body.action) {
    return { error: 'Image and action are required' };
  }
  if (!['approve', 'reject', 'regenerate'].includes(body.action)) {
    return { error: 'Invalid action' };
  }
  return {};
};

// Apply authentication and rate limiting to all routes
router.use(authenticate);
router.use(apiLimiter);

// Endpoint to generate image
router.post(
  '/generate-image',
  validate(validateContext),
  async (req: Request, res: Response) => {
    const { context } = req.body;
    try {
      if (!imageGeneration) {
        return res
          .status(400)
          .json({ error: 'Image generation is not enabled' });
      }
      const response = await huggingFaceClient.generateImage(context);
      res.json(response.data || response);
    } catch (error) {
      console.error('Error generating image:', error);
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data?.error || 'Failed to generate image';
      res.status(statusCode).json({ error: errorMessage });
    }
  }
);

// Endpoint to approve image
router.post(
  '/approve-image',
  validate(validateImage),
  async (req: Request, res: Response) => {
    const { image } = req.body;
    try {
      const response = await huggingFaceClient.approveImage(image);
      res.json(response);
    } catch (error) {
      console.error('Error approving image:', error);
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data?.error || 'Failed to approve image';
      res.status(statusCode).json({ error: errorMessage });
    }
  }
);

// Endpoint to regenerate image
router.post(
  '/regenerate-image',
  validate(validateContext),
  async (req: Request, res: Response) => {
    const { context } = req.body;
    try {
      const response = await huggingFaceClient.post('/regenerate-image', { context });
      res.json(response.data);
    } catch (error) {
      console.error('Error regenerating image:', error);
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data?.error || 'Failed to regenerate image';
      res.status(statusCode).json({ error: errorMessage });
    }
  }
);

// Endpoint to upload image
router.post(
  '/upload-image',
  validate(validateFile),
  async (req: Request, res: Response) => {
    const { file } = req.body;
    try {
      const response = await huggingFaceClient.uploadImage(file);
      res.json(response);
    } catch (error) {
      console.error('Error uploading image:', error);
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data?.error || 'Failed to upload image';
      res.status(statusCode).json({ error: errorMessage });
    }
  }
);

// Endpoint to review image
router.post(
  '/review-image',
  validate(validateReview),
  async (req: Request, res: Response) => {
    const { image, action } = req.body;
    try {
      let response;
      if (action === 'approve') {
        response = await huggingFaceClient.approveImage(image);
      } else if (action === 'reject') {
        response = await huggingFaceClient.rejectImage(image);
      } else if (action === 'regenerate') {
        if (!image.context) {
          return res.status(400).json({ error: 'Context is required for regeneration' });
        }
        response = await huggingFaceClient.regenerateImage(image.context);
      }
      res.json(response);
    } catch (error) {
      console.error(`Error processing ${action} action:`, error);
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data?.error || `Failed to ${action} image`;
      res.status(statusCode).json({ error: errorMessage });
    }
  }
);

export default router;
