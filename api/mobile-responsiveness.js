import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Handles API requests for the mobile responsiveness endpoint.
 *
 * Responds with a confirmation message for GET requests. Returns a 405 error for all other HTTP methods.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json({ message: 'Mobile responsiveness API is working' });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
