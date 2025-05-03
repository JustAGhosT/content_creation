import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * Client for interacting with the HuggingFace API for image generation
 */
class HuggingFaceClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string = 'https://api-inference.huggingface.co/models';
  
  constructor() {
    // Get API key from environment variables
    this.apiKey = process.env.HUGGINGFACE_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('HUGGINGFACE_API_KEY environment variable not set');
    }
    
    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }
  
  /**
   * Generate an image based on text context
   * @param context The text prompt to generate an image from
   * @returns Response from the HuggingFace API
   */
  async generateImage(context: string): Promise<AxiosResponse> {
    // Use a text-to-image model like stable-diffusion
    const model = process.env.HUGGINGFACE_IMAGE_MODEL || 'stabilityai/stable-diffusion-2';
    
    return this.client.post(`/${model}`, {
      inputs: context,
      options: {
        wait_for_model: true
      }
    });
  }
  
  /**
   * Approve an image (mark it as accepted)
   * @param image The image data to approve
   * @returns Success message
   */
  async approveImage(image: Record<string, any>): Promise<{ success: boolean; message: string }> {
    // This would typically interact with your own database or service
    // Since there's no actual approval endpoint in HuggingFace API, we simulate it
    console.log('Image approved:', image);
    return {
      success: true,
      message: 'Image approved successfully'
    };
  }
  
  /**
   * Reject an image (mark it as rejected)
   * @param image The image data to reject
   * @returns Success message
   */
  async rejectImage(image: Record<string, any>): Promise<{ success: boolean; message: string }> {
    // This would typically interact with your own database or service
    console.log('Image rejected:', image);
    return {
      success: true,
      message: 'Image rejected successfully'
    };
  }
  
  /**
   * Regenerate an image with the same context
   * @param context The text prompt to regenerate an image from
   * @returns Response from the HuggingFace API
   */
  async regenerateImage(context: string): Promise<AxiosResponse> {
    // Simply call generateImage with the same context
    return this.generateImage(context);
  }
  
  /**
   * Upload an image to HuggingFace (if supported) or your storage
   * @param file The file data to upload
   * @returns Success message
   */
  async uploadImage(file: any): Promise<{ success: boolean; url?: string; message: string }> {
    // This would typically upload to your own storage service
    // Since direct file upload to HuggingFace isn't part of their inference API
    console.log('Image upload requested:', file);
    return {
      success: true,
      message: 'Image upload simulation successful',
      url: 'https://example.com/simulated-upload-path'
    };
  }
  
  /**
   * Make a custom POST request to the HuggingFace API
   * @param endpoint The API endpoint to call
   * @param data The data to send in the request body
   * @returns Response from the HuggingFace API
   */
  async post(endpoint: string, data: any): Promise<AxiosResponse> {
    return this.client.post(endpoint, data);
  }
}

export default HuggingFaceClient;