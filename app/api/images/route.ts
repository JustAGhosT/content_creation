import { NextResponse } from 'next/server';
import { withErrorHandling, Errors } from '../_utils/errors';
import { validateString } from '../_utils/validation';
import { createLogEntry, logToAuditTrail } from '../_utils/audit';
import { isAuthenticated } from '../_utils/auth';
import axios, { AxiosError } from 'axios';

// Import feature flag utility
// Note: This assumes you have a featureFlags utility in lib/
// You may need to adjust the import path based on your project structure
import featureFlags from '../../../utils/featureFlags';

// Create a HuggingFace client class
// This is a simplified version of the client from your api/huggingface-client.ts
class HuggingFaceClient {
  private apiKey: string;
  private baseUrl: string = 'https://api-inference.huggingface.co/models';
  
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('HUGGINGFACE_API_KEY environment variable not set');
    }
  }
  
  async generateImage(context: string) {
    // Use a text-to-image model like stable-diffusion
    const model = process.env.HUGGINGFACE_IMAGE_MODEL || 'stabilityai/stable-diffusion-2';
    
    return axios.post(`${this.baseUrl}/${model}`, {
      inputs: context,
      options: {
        wait_for_model: true
      }
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }
  
  async approveImage(image: Record<string, any>) {
    // This would typically interact with your own database or service
    console.log('Image approved:', image);
    return {
      success: true,
      message: 'Image approved successfully'
    };
  }
  
  async rejectImage(image: Record<string, any>) {
    // This would typically interact with your own database or service
    console.log('Image rejected:', image);
    return {
      success: true,
      message: 'Image rejected successfully'
    };
  }
  
  async regenerateImage(context: string) {
    // Simply call generateImage with the same context
    return this.generateImage(context);
  }
}

// Initialize the HuggingFace client
const huggingFaceClient = new HuggingFaceClient();

// Generate image endpoint
export const POST = withErrorHandling(async (request: Request) => {
  // Check authentication
  if (!isAuthenticated()) {
    return Errors.unauthorized('Authentication required to generate images');
  }
  
  // Check if image generation feature is enabled
  if (!featureFlags.imageGeneration) {
    return Errors.forbidden('Image generation feature is disabled');
  }
  
  try {
    const body = await request.json();
    const { context } = body;
    
    // Validate context
    const contextError = validateString(context, 'Context');
    if (contextError) {
      return Errors.badRequest(contextError);
    }
    
    // Log the image generation request
    await logToAuditTrail(createLogEntry('GENERATE_IMAGE', { contextLength: context.length }));
    
    // Generate the image
    const response = await huggingFaceClient.generateImage(context);
    
    // Return the generated image data
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error generating image:', error);
    
    // Handle specific error types
    if (error instanceof AxiosError) {
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data?.error || 'Failed to generate image';
      return Errors.createErrorResponse(errorMessage, statusCode);
    }
    
    return Errors.internalServerError('Failed to generate image');
  }
});

// Review image endpoint (approve, reject, regenerate)
export const PUT = withErrorHandling(async (request: Request) => {
  // Check authentication
  if (!isAuthenticated()) {
    return Errors.unauthorized('Authentication required to review images');
  }
  
  try {
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
    await logToAuditTrail(createLogEntry('REVIEW_IMAGE', { action }));
    
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