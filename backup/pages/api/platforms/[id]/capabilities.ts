import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../../middleware/withAuth';
import { platforms, getPlatformConfig } from '../../../../config/platforms';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

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

export default withAuth(handler);