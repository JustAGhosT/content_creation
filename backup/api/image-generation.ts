import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { imageGeneration } from './feature-flags';
import HuggingFaceClient from './huggingface-api-client';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { AxiosError } from 'axios';

const router = Router();
const huggingFaceClient = new HuggingFaceClient();

// Define a custom interface for the user object
interface UserPayload {
  [key: string]: any;
  isAdmin?: boolean;
}

// Extend the Express Request interface to include our user type
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}
// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

// Authentication middleware - fixed to handle JWT payload properly
const authenticate: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    
    // Convert the JWT payload to our UserPayload type
    if (typeof decoded === 'string') {
      // If it's a string, create a simple user object
      req.user = { id: decoded };
    } else {
      // If it's a JwtPayload, use it directly
      req.user = decoded as UserPayload;
    }
    next();
  } catch (err: unknown) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Define interfaces for request body validation
interface ValidationResult {
  error?: string;
}

interface ContextRequest {
  context?: string;
}

interface ImageRequest {
  image?: Record<string, any>;
}

interface FileRequest {
  file?: any;
}

interface ReviewRequest {
  image?: Record<string, any>;
  action?: 'approve' | 'reject' | 'regenerate';
}

// Update the validate middleware to not return a value
const validate = <T>(schema: (body: T) => ValidationResult): RequestHandler => (req, res, next) => {
  const { error } = schema(req.body as T);
  if (error) {
    res.status(400).json({ error: error.toString() });
    return;
  }
  next();
};

// Validation schemas with proper typing
const validateContext = (body: ContextRequest): ValidationResult => {
  if (!body || typeof body.context !== 'string' || !body.context.trim()) {
    return { error: 'Context is required and must be a non-empty string' };
  }
  return {};
};
const validateImage = (body: ImageRequest): ValidationResult => {
  if (!body || typeof body.image !== 'object' || !body.image) {
    return { error: 'Invalid image data provided' };
  }
  return {};
};
const validateFile = (body: FileRequest): ValidationResult => {
  if (!body || !body.file) {
    return { error: 'File is required' };
  }
  return {};
};
const validateReview = (body: ReviewRequest): ValidationResult => {
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

// Fixed route handlers to be properly typed as RequestHandler with proper error handling
router.post(
  '/generate-image',
  validate<ContextRequest>(validateContext),
  (async (req: Request, res: Response) => {
    const { context } = req.body;
    try {
      if (!imageGeneration) {
        res.status(400).json({ error: 'Image generation is not enabled' });
        return;
      }
      const response = await huggingFaceClient.generateImage(context);
      res.json(response.data || response);
    } catch (error: unknown) {
      console.error('Error generating image:', error);
      let statusCode = 500;
      let errorMessage = 'Failed to generate image';
      
      if (error instanceof AxiosError) {
        statusCode = error.response?.status || 500;
        errorMessage = error.response?.data?.error || errorMessage;
      }
      res.status(statusCode).json({ error: errorMessage });
    }
  }) as RequestHandler
);

router.post(
  '/approve-image',
  validate<ImageRequest>(validateImage),
  (async (req: Request, res: Response) => {
    const { image } = req.body;
    try {
      const response = await huggingFaceClient.approveImage(image);
      res.json(response);
    } catch (error: unknown) {
      console.error('Error approving image:', error);
      let statusCode = 500;
      let errorMessage = 'Failed to approve image';
      
      if (error instanceof AxiosError) {
        statusCode = error.response?.status || 500;
        errorMessage = error.response?.data?.error || errorMessage;
      }
      res.status(statusCode).json({ error: errorMessage });
    }
  }) as RequestHandler
);

router.post(
  '/regenerate-image',
  validate<ContextRequest>(validateContext),
  (async (req: Request, res: Response) => {
    const { context } = req.body;
    try {
      const response = await huggingFaceClient.post('/regenerate-image', { context });
      res.json(response.data);
    } catch (error: unknown) {
      console.error('Error regenerating image:', error);
      let statusCode = 500;
      let errorMessage = 'Failed to regenerate image';
      
      if (error instanceof AxiosError) {
        statusCode = error.response?.status || 500;
        errorMessage = error.response?.data?.error || errorMessage;
      }
      res.status(statusCode).json({ error: errorMessage });
    }
  }) as RequestHandler
);

router.post(
  '/upload-image',
  validate<FileRequest>(validateFile),
  (async (req: Request, res: Response) => {
    const { file } = req.body;
    try {
      const response = await huggingFaceClient.uploadImage(file);
      res.json(response);
    } catch (error: unknown) {
      console.error('Error uploading image:', error);
      let statusCode = 500;
      let errorMessage = 'Failed to upload image';
      
      if (error instanceof AxiosError) {
        statusCode = error.response?.status || 500;
        errorMessage = error.response?.data?.error || errorMessage;
      }
      
      res.status(statusCode).json({ error: errorMessage });
    }
  }) as RequestHandler
);

router.post(
  '/review-image',
  validate<ReviewRequest>(validateReview),
  (async (req: Request, res: Response) => {
    const { image, action } = req.body;
    try {
      let response;
      if (action === 'approve') {
        response = await huggingFaceClient.approveImage(image);
      } else if (action === 'reject') {
        response = await huggingFaceClient.rejectImage(image);
      } else if (action === 'regenerate') {
        if (!image.context) {
          res.status(400).json({ error: 'Context is required for regeneration' });
          return;
        }
        response = await huggingFaceClient.regenerateImage(image.context);
      }
      res.json(response);
    } catch (error: unknown) {
      console.error(`Error processing ${action} action:`, error);
      let statusCode = 500;
      let errorMessage = `Failed to ${action} image`;
      
      if (error instanceof AxiosError) {
        statusCode = error.response?.status || 500;
        errorMessage = error.response?.data?.error || errorMessage;
      }
      
      res.status(statusCode).json({ error: errorMessage });
    }
  }) as RequestHandler
);
export default router;
