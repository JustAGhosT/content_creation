import { NextRequest, NextResponse } from 'next/server';
import { validateAllowedProperties } from '@/app/api/_utils/validation';
import { z } from 'zod';
import { featureFlags, TextParserFeatureFlag } from '@/lib/feature-flags';

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

/**
 * GET handler for retrieving all feature flags
 */
export async function GET() {
  // Return all feature flags
  return NextResponse.json(featureFlags);
}

/**
 * POST handler for updating feature flags
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const parseResult = FeatureFlagSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.message },
        { status: 400 }
      );
    }
    const { feature, enabled, implementation } = parseResult.data;

    // Validate allowed properties
    const allowedProps = ['feature', 'enabled', 'implementation'];
    const invalidProps = validateAllowedProperties(body, allowedProps);
    if (invalidProps) {
      return NextResponse.json(
        { error: `Invalid properties in request body: ${invalidProps.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if feature exists
    if (!hasProperty(featureFlags, feature)) {
      return NextResponse.json(
        { error: 'Invalid feature flag' },
        { status: 400 }
      );
    }
    // Update the feature flag
    try {
      // Get the current value of the feature flag
      const currentValue = featureFlags[feature];
    
      // Update based on type
      if (typeof currentValue === 'object' && currentValue !== null) {
        // Handle complex feature flags (like textParser)
        if (feature === 'textParser') {
          // We know this is the text parser feature flag
          const textParserFlag = featureFlags.textParser as TextParserFeatureFlag;
          textParserFlag.enabled = enabled;
        
          if (implementation !== undefined) {
            textParserFlag.implementation = implementation;
          }
        } else {
          // Generic object feature flag
          const flagObject = currentValue as { enabled: boolean };
          flagObject.enabled = enabled;
        }
      } else if (typeof currentValue === 'boolean') {
        // Handle simple boolean feature flags
        featureFlags[feature] = enabled;
      }
    
      // In a real implementation, you would save the updated feature flags here
      // For example: await saveFeatureFlags();
    
      return NextResponse.json({ 
        message: 'Feature flag updated successfully',
        feature,
        enabled,
        ...(implementation !== undefined ? { implementation } : {})
      });
    } catch (err) {
      console.error('Failed to persist feature flags:', err);
      return NextResponse.json(
        { error: 'Failed to persist feature flags' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing feature flag update:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
