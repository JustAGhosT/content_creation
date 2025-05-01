import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../types';

// Extend the NextApiRequest type to include user
declare module 'next' {
  interface NextApiRequest {
    user?: UserPayload;
  }
}

export function withAuth(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
      
      // Convert the JWT payload to our UserPayload type
      if (typeof decoded === 'string') {
        req.user = { id: decoded };
      } else {
        req.user = decoded as UserPayload;
      }
    return handler(req, res);
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
}
  };
}

export function withAdminAuth(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) {
  return withAuth(async (req: NextApiRequest, res: NextApiResponse) => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    return handler(req, res);
  });
}