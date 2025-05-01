declare class HuggingFaceClient {
  constructor();
  generateImage(context: string): Promise<any>;
  approveImage(image: Record<string, any>): Promise<{ success: boolean; message: string }>;
  rejectImage(image: Record<string, any>): Promise<{ success: boolean; message: string }>;
  regenerateImage(context: string): Promise<any>;
  uploadImage(file: any): Promise<{ success: boolean; url?: string; message: string }>;
  post(endpoint: string, data: any): Promise<any>;
}

export default HuggingFaceClient;