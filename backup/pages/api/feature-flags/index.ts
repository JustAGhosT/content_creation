import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth } from '../../../middleware/withAuth';
import { TextParserFeatureFlag } from '../../../types';
import featureFlags, { saveFeatureFlags } from '../../../utils/featureFlags';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET all feature flags
  if (req.method === 'GET') {
    return res.json(featureFlags);
  }
  
  // POST to update a feature flag
  if (req.method === 'POST') {
    const { feature, enabled, implementation } = req.body;

    // Validate input
    if (!feature || typeof feature !== 'string') {
      return res.status(400).json({ message: 'Feature name must be a non-empty string' });
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ message: 'Enabled must be a boolean value' });
    }

    // Only allow known properties
    const allowedProps = ['feature', 'enabled', 'implementation'];
    const invalidProps = Object.keys(req.body).filter(prop => !allowedProps.includes(prop));
    if (invalidProps.length > 0) {
      return res.status(400).json({ message: `Invalid properties in request body: ${invalidProps.join(', ')}` });
    }

    if (Object.prototype.hasOwnProperty.call(featureFlags, feature)) {
      if (typeof featureFlags[feature] === 'object') {
        (featureFlags[feature] as any).enabled = enabled;
        if (typeof implementation !== 'undefined') {
          // Validate implementation values for textParser
          if (
            feature === 'textParser' &&
            !['deepseek', 'openai', 'azure'].includes(implementation)
          ) {
            return res.status(400).json({ message: 'Invalid implementation value' });
          }
          (featureFlags[feature] as TextParserFeatureFlag).implementation = implementation as 'deepseek' | 'openai' | 'azure';
        }
      } else {
        featureFlags[feature] = enabled;
      }
      try {
        saveFeatureFlags();
        return res.status(200).json({ message: 'Feature flag updated successfully' });
      } catch (err) {
        return res.status(500).json({ message: 'Failed to persist feature flags' });
      }
    } else {
      return res.status(400).json({ message: 'Invalid feature flag' });
    }
  }
  
  // Method not allowed
  return res.status(405).json({ message: 'Method not allowed' });
}

export default withAdminAuth(handler);