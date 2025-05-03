import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../middleware/withAuth';
import { platforms } from '../../../config/platforms';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  res.json(platforms);
}

export default withAuth(handler);