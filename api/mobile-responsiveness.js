import { NextApiRequest, NextApiResponse } from 'next';

/**
 * API route handler for the mobile responsiveness endpoint.
 *
 * Responds with a JSON confirmation message for GET requests. Returns a 405 status code with an error message for all other HTTP methods.
 */
export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({ message: 'Mobile responsiveness API is working' });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
