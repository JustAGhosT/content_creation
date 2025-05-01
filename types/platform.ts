import { Platform } from '../config/platforms';

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