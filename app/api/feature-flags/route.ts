import { NextResponse } from 'next/server';
import featureFlags, { FeatureFlag, FeatureFlags, saveFeatureFlags } from '../../../utils/featureFlags';
import { createLogEntry, logToAuditTrail } from '../_utils/audit';
import { isAdmin } from '../_utils/auth';
import { Errors, withErrorHandling } from '../_utils/errors';
import { validateAllowedProperties } from '../_utils/validation';
import { z } from 'zod';

// Define schema for feature flag updates
const FeatureFlagSchema = z.object({
  feature: z.string(),
  enabled: z.boolean(),
  implementation: z.enum(['deepseek', 'openai', 'azure']).optional()
});

// Type for parsed feature flag update
type FeatureFlagUpdate = z.infer<typeof FeatureFlagSchema>;

// Helper function to check if a property exists in an object
function hasProperty<T extends object, K extends PropertyKey>(
  obj: T,
  prop: K
): obj is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
export const GET = withErrorHandling(async () => {
  // Log the access to feature flags
  await logToAuditTrail(await createLogEntry('GET_FEATURE_FLAGS'));
  
  // Return all feature flags
  return NextResponse.json(featureFlags);
});

export const POST = withErrorHandling(async (request: Request) => {
  // Check admin authorization
  if (!(await isAdmin())) {
    return Errors.forbidden('Admin privileges required to update feature flags');
  }

  // Parse the request body
  const body = await request.json();
  const parseResult = FeatureFlagSchema.safeParse(body);
  if (!parseResult.success) {
    return Errors.badRequest(parseResult.error.message);
  }
  const { feature, enabled, implementation } = parseResult.data;

  // Validate allowed properties
  const allowedProps = ['feature', 'enabled', 'implementation'];
  const invalidProps = validateAllowedProperties(body, allowedProps);
  if (invalidProps) {
    return Errors.badRequest(`Invalid properties in request body: ${invalidProps.join(', ')}`);
  }

  // Check if feature exists
  if (!hasProperty(featureFlags, feature)) {
    return Errors.badRequest('Invalid feature flag');
  }

  // Log the update action
  await logToAuditTrail(await createLogEntry('UPDATE_FEATURE_FLAG', body));

  // Update the feature flag
  try {
    // Get the current value of the feature flag
    const currentValue = featureFlags[feature];
    
    // Update based on type
    if (typeof currentValue === 'object' && currentValue !== null) {
      // Handle complex feature flags (like textParser)
      if (feature === 'textParser') {
        // We know this is the text parser feature flag
        const textParserFlag = featureFlags.textParser;
        textParserFlag.enabled = enabled;
        
        if (implementation !== undefined) {
          textParserFlag.implementation = implementation;
        }
      } else {
        // Generic object feature flag
        const flagObject = currentValue as FeatureFlag;
        flagObject.enabled = enabled;
      }
    } else if (typeof currentValue === 'boolean') {
      // Handle simple boolean feature flags
      featureFlags[feature] = enabled;
    }
    
    // Save the updated feature flags
    await saveFeatureFlags();
    
    return NextResponse.json({ 
      message: 'Feature flag updated successfully',
      feature,
      enabled,
      ...(implementation !== undefined ? { implementation } : {})
    });
  } catch (err) {
    console.error('Failed to persist feature flags:', err);
    return Errors.internalServerError('Failed to persist feature flags');
  }
});