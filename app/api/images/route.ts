import { NextResponse } from 'next/server';
import featureFlags from '../../../utils/featureFlags';
import { createLogEntry, logToAuditTrail } from '../_utils/audit';
import { isAuthenticated } from '../_utils/auth';
import { Errors, withErrorHandling } from '../_utils/errors';
import { validateString } from '../_utils/validation';
import { HuggingFaceClient } from '../../../lib/clients/huggingface';

// Initialize the HuggingFace client
const huggingFaceClient = new HuggingFaceClient();

// Generate image endpoint
export const POST = withErrorHandling(async (request: Request) => {
  try {
    // Check authentication
    if (!isAuthenticated()) {
      return Errors.unauthorized('Authentication required to generate images');
    }
    
    // Check if image generation feature is enabled
    if (!featureFlags.imageGeneration) {
      return Errors.forbidden('Image generation feature is disabled');
    }
    
    const body = await request.json();
    const { context } = body;
    
    // Validate context
    const contextError = validateString(context, 'Context');
    if (contextError) {
      return Errors.badRequest(contextError);
    }
    
    // Log the image generation request
    const logEntry = await createLogEntry('GENERATE_IMAGE', { contextLength: context.length });
    await logToAuditTrail(logEntry);
    
    // Generate the image
    const response = await huggingFaceClient.generateImage(context);
    
    // Return the generated image data
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error generating image:', error);
    return Errors.internalServerError('Failed to generate image');
  }
});

// Review image endpoint
export const PUT = withErrorHandling(async (request: Request) => {
  try {
    if (!isAuthenticated()) {
      return Errors.unauthorized('Authentication required to review images');
    }
    
    const body = await request.json();
    const { image, action } = body;
    
    // Validate image and action
    if (!image || typeof image !== 'object') {
      return Errors.badRequest('Invalid image data provided');
    }
    
    if (!action || !['approve', 'reject', 'regenerate'].includes(action)) {
      return Errors.badRequest('Invalid action. Must be one of: approve, reject, regenerate');
    }
    
    // Log the image review action
    const logEntry = await createLogEntry('REVIEW_IMAGE', { action });
    await logToAuditTrail(logEntry);
    
    let response;
    
    // Perform the requested action
    if (action === 'approve') {
      response = await huggingFaceClient.approveImage(image);
    } else if (action === 'reject') {
      response = await huggingFaceClient.rejectImage(image);
    } else if (action === 'regenerate') {
      if (!image.context) {
        return Errors.badRequest('Context is required for regeneration');
      }
      response = await huggingFaceClient.regenerateImage(image.context);
      // For regenerate, return the same format as the POST endpoint
      return NextResponse.json(response.data);
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error reviewing image:', error);
    return Errors.internalServerError('Failed to process image review');
  }
});