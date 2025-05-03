// Platform types
export interface Platform {
  id: number;
  name: string;
  // Add other platform fields
}

export interface PlatformConfig {
  apiUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  capabilities?: string[];
  required?: boolean;
}

// Content types
export interface ContentType {
  id?: string;
  title?: string;
  description?: string;
  // Add other relevant fields
}

export interface QueueItem {
  platform: Platform;
  content: ContentType;
}

export interface PublishResult {
  item: QueueItem;
  error?: string;
}

// Feature flag types
export interface BaseFeatureFlag {
  enabled: boolean;
}

export interface TextParserFeatureFlag extends BaseFeatureFlag {
  implementation: 'deepseek' | 'openai' | 'azure';
}

export interface FeatureFlags {
  textParser: TextParserFeatureFlag;
  imageGeneration: boolean;
  summarization: boolean;
  platformConnectors: boolean;
  multiPlatformPublishing: boolean;
  notificationSystem: boolean;
  feedbackMechanism: boolean;
  [key: string]: boolean | BaseFeatureFlag | TextParserFeatureFlag;
}

// Feedback types
export interface Feedback {
  reviewId: string;
  feedback: string;
}

// User types
export interface UserPayload {
  [key: string]: any;
  isAdmin?: boolean;
}