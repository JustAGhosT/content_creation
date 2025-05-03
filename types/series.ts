export interface Series {
  title: string;
  description: string;
  topics?: string[];
  targetAudience?: string;
  estimatedArticles?: number;
  publishFrequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  status?: 'planning' | 'in-progress' | 'completed' | 'paused';
  [key: string]: any;
}