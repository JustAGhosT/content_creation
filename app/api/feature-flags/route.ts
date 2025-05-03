import { NextResponse } from 'next/server';
import { TextParserFeatureFlag } from '../../../types';
import featureFlags, { saveFeatureFlags } from '../../../utils/featureFlags';
import { isAdmin } from '../_utils/auth';
import { Errors, withErrorHandling } from '../_utils/errors';
import { validateBoolean, validateString, validateEnum, validateAllowedProperties } from '../_utils/validation';
import { withAuditLogging, createLogEntry, logToAuditTrail } from '../_utils/audit';

export const GET = withErrorHandling(async () => {
  // Log the access to feature flags
  await logToAuditTrail(createLogEntry('GET_FEATURE_FLAGS'));
  
  // Return all feature flags
  return NextResponse.json(featureFlags);
});

export const POST = withErrorHandling(async (request: Request) => {
  // Check admin authorization
  if (!isAdmin()) {
    return Errors.forbidden('Admin privileges required to update feature flags');
  }

  // Parse the request body
  const body = await request.json();
  const { feature, enabled, implementation } = body;

  // Validate feature name
  const featureError = validateString(feature, 'Feature name');
  if (featureError) {
    return Errors.badRequest(featureError);
  }

  // Validate enabled flag
  const enabledError = validateBoolean(enabled, 'Enabled flag');
  if (enabledError) {
    return Errors.badRequest(enabledError);
  }

  // Validate allowed properties
  const allowedProps = ['feature', 'enabled', 'implementation'];
  const invalidProps = validateAllowedProperties(body, allowedProps);
  if (invalidProps) {
    return Errors.badRequest(`Invalid properties in request body: ${invalidProps.join(', ')}`);
  }

  // Check if feature exists
  if (!Object.prototype.hasOwnProperty.call(featureFlags, feature)) {
    return Errors.badRequest('Invalid feature flag');
  }

  // Handle implementation for textParser feature
  if (implementation !== undefined && feature === 'textParser') {
    const implementationError = validateEnum(
      implementation, 
      ['deepseek', 'openai', 'azure'], 
      'Implementation'
    );
    
    if (implementationError) {
      return Errors.badRequest(implementationError);
    }
  }

  // Log the update action
  await logToAuditTrail(createLogEntry('UPDATE_FEATURE_FLAG', body));

  // Check feature flags
  if (!featureFlags.trigger.cron.enabled) {
    return Errors.forbidden('CRON trigger feature is disabled');
  }

  if (!featureFlags.trigger.rss.enabled) {
    return Errors.forbidden('RSS trigger feature is disabled');
  }

  if (!featureFlags.scraping.enabled) {
    return Errors.forbidden('Scraping feature is disabled');
  }

  if (!featureFlags.storage.notion.enabled) {
    return Errors.forbidden('Notion storage feature is disabled');
  }

  if (!featureFlags.writing.openai.enabled) {
    return Errors.forbidden('OpenAI writing feature is disabled');
  }

  if (!featureFlags.distribution.telegram.enabled) {
    return Errors.forbidden('Telegram distribution feature is disabled');
  }

  // Update the feature flag
  try {
    if (typeof featureFlags[feature] === 'object') {
      (featureFlags[feature] as any).enabled = enabled;
      if (typeof implementation !== 'undefined' && feature === 'textParser') {
        (featureFlags[feature] as TextParserFeatureFlag).implementation = implementation as 'deepseek' | 'openai' | 'azure';
      }
    } else {
      featureFlags[feature] = enabled;
    }
    
    // Save the updated feature flags
    saveFeatureFlags();
    
    return NextResponse.json({ 
      message: 'Feature flag updated successfully',
      feature,
      enabled,
      ...(implementation ? { implementation } : {})
    });
  } catch (err) {
    return Errors.internalServerError('Failed to persist feature flags');
  }
});
