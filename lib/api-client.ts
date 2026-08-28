import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { tokenStorage } from './storage/token-storage';

// Define API response interface
export interface ApiResponse<T = Record<string, unknown>> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

// Define API error interface
export interface ApiError {
  message: string;
  status: number;
  details?: Record<string, unknown> | unknown;
  code?: string;
}

export interface AuthSessionUser {
  id: string;
  name: string;
  username: string;
  role: string;
}

export interface AuthSessionResponse {
  authenticated: boolean;
  user: AuthSessionUser | null;
}

export interface PlatformItem {
  id: number;
  name: string;
  icon: string;
  enabled: boolean;
  [key: string]: unknown;
}

export interface ImageGenerationResult {
  url: string;
  id?: string;
  [key: string]: unknown;
}

export interface SummaryResult {
  summary: string;
  [key: string]: unknown;
}

export interface ContentTrackingResult {
  data: unknown[];
  pagination?: {
    hasMorePages: boolean;
    totalCount?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * API Client for making requests to the backend API
 */
class ApiClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL
        ? process.env.NEXT_PUBLIC_API_BASE_URL
        : '';

    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    // Check if client was properly initialized
    if (this.client && this.client.interceptors) {
      // Add request interceptor to include auth token
      this.client.interceptors.request.use(
        config => {
          // Get token from token storage
          const token = tokenStorage.getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        },
        error => {
          return Promise.reject(error);
        }
      );

      // Add response interceptor for error handling
      this.client.interceptors.response.use(
        response => response,
        (error: AxiosError) => {
          // Handle specific error cases
          if (error.response?.status === 401) {
            // Unauthorized - redirect to login
            tokenStorage.removeToken();
            if (globalThis.window !== undefined) {
              globalThis.window.location.href = '/login';
            }
          }

          // Format error for consistent handling
          const responseData = error.response?.data as
            | { message?: string; details?: Record<string, unknown>; code?: string }
            | undefined;
          const apiError: ApiError = {
            message: responseData?.message || error.message,
            status: error.response?.status || 500,
            details: responseData?.details,
            code: responseData?.code,
          };

          return Promise.reject(apiError);
        }
      );
    }
  }

  /**
   * Make a GET request
   * @param url API endpoint
   * @param config Optional axios config
   * @returns Promise with response data
   */
  public async get<T = Record<string, unknown>>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * Make a POST request
   * @param url API endpoint
   * @param data Request body
   * @param config Optional axios config
   * @returns Promise with response data
   */
  public async post<T = Record<string, unknown>>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * Make a PUT request
   * @param url API endpoint
   * @param data Request body
   * @param config Optional axios config
   * @returns Promise with response data
   */
  public async put<T = Record<string, unknown>>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * Make a DELETE request
   * @param url API endpoint
   * @param config Optional axios config
   * @returns Promise with response data
   */
  public async delete<T = Record<string, unknown>>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  /**
   * Login user
   * @param username Username
   * @param password Password
   * @returns User data and token
   */
  public async login(
    username: string,
    password: string
  ): Promise<{ user: AuthSessionUser; token: string }> {
    const response = await this.post<{ user: AuthSessionUser; token: string }>('/api/auth', {
      username,
      password,
    });

    // Store token using token storage service
    tokenStorage.setToken(response.token);

    return response;
  }

  /**
   * Logout user
   * @returns Success message
   */
  public async logout(): Promise<{ message: string }> {
    const response = await this.delete<{ message: string }>('/api/auth');

    // Remove token using token storage service
    tokenStorage.removeToken();

    return response;
  }

  /**
   * Get the current cookie-backed auth session, if one exists.
   */
  public async getSession(): Promise<AuthSessionResponse> {
    return this.get<AuthSessionResponse>('/api/auth/session');
  }

  /**
   * Get all platforms
   * @returns Array of platforms
   */
  public async getPlatforms(): Promise<PlatformItem[]> {
    return this.get<PlatformItem[]>('/api/platforms');
  }

  /**
   * Get platform capabilities
   * @param platformId Platform ID
   * @returns Platform capabilities
   */
  public async getPlatformCapabilities(platformId: number): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(`/api/platforms/${platformId}/capabilities`);
  }

  /**
   * Get feature flags
   * @returns Feature flags object
   */
  public async getFeatureFlags<T = Record<string, boolean | string>>(): Promise<T> {
    return this.get<T>('/api/feature-flags');
  }

  /**
   * Update feature flag
   * @param feature Feature name
   * @param enabled Enabled state
   * @param implementation Optional implementation (for textParser)
   * @returns Success message
   */
  public async updateFeatureFlag(
    feature: string,
    enabled: boolean,
    implementation?: string
  ): Promise<{ message: string }> {
    return this.post<{ message: string }>('/api/feature-flags', {
      feature,
      enabled,
      ...(implementation ? { implementation } : {}),
    });
  }

  /**
   * Approve queue
   * @param queue Queue items
   * @returns Success message and results
   */
  public async approveQueue(queue: unknown[]): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/api/queue/approve', { queue });
  }

  /**
   * Generate image
   * @param context Image generation context
   * @returns Generated image data
   */
  public async generateImage(context: string): Promise<ImageGenerationResult> {
    return this.post<ImageGenerationResult>('/api/images', { context });
  }

  /**
   * Review image (approve, reject, regenerate)
   * @param image Image data
   * @param action Action to perform (approve, reject, regenerate)
   * @returns Action result
   */
  public async reviewImage(
    image: unknown,
    action: 'approve' | 'reject' | 'regenerate'
  ): Promise<ImageGenerationResult> {
    return this.put<ImageGenerationResult>('/api/images', { image, action });
  }

  /**
   * Parse text
   * @param rawInput Raw input text
   * @returns Parsed data
   */
  public async parseText(rawInput: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/api/parse', { rawInput });
  }

  /**
   * Analyze parsed data
   * @param parsedData Parsed data to analyze
   * @returns Analysis results
   */
  public async analyzeParsedData(parsedData: unknown): Promise<Record<string, unknown>> {
    return this.put<Record<string, unknown>>('/api/parse', { parsedData });
  }

  /**
   * Summarize text
   * @param rawText Raw text to summarize
   * @returns Summary data
   */
  public async summarizeText(rawText: string): Promise<SummaryResult> {
    return this.post<SummaryResult>('/api/summarize', { rawText });
  }

  /**
   * Approve summary
   * @param summary Summary to approve
   * @returns Approval result
   */
  public async approveSummary(summary: string): Promise<SummaryResult> {
    return this.put<SummaryResult>('/api/summarize', { summary });
  }

  /**
   * Submit feedback
   * @param reviewId Review ID
   * @param feedback Feedback text
   * @returns Success message
   */
  public async submitFeedback(reviewId: string, feedback: string): Promise<{ message: string }> {
    return this.post<{ message: string }>('/api/feedback', { reviewId, feedback });
  }

  /**
   * Get feedback
   * @param reviewId Optional review ID to filter by
   * @returns Array of feedback items
   */
  public async getFeedback(reviewId?: string): Promise<unknown[]> {
    const url = reviewId ? `/api/feedback?reviewId=${reviewId}` : '/api/feedback';
    return this.get<unknown[]>(url);
  }

  /**
   * Store content
   * @param content Content to store
   * @returns Success message and record ID
   */
  public async storeContent(content: string): Promise<{ message: string; recordId: string }> {
    return this.post<{ message: string; recordId: string }>('/api/content', { content });
  }

  /**
   * Track content
   * @param page Page number
   * @param pageSize Page size
   * @param filter Optional filter
   * @param nextToken Optional pagination token
   * @returns Content data with pagination
   */
  public async trackContent(
    page: number = 1,
    pageSize: number = 20,
    filter?: string,
    nextToken?: string
  ): Promise<ContentTrackingResult> {
    let url = `/api/content?page=${page}&pageSize=${pageSize}`;
    if (filter) url += `&filter=${encodeURIComponent(filter)}`;
    if (nextToken) url += `&nextToken=${encodeURIComponent(nextToken)}`;
    return this.get<ContentTrackingResult>(url);
  }

  /**
   * Send notification
   * @param type Notification type (email, slack, sms)
   * @param recipient Recipient
   * @param message Message
   * @returns Success message
   */
  public async sendNotification(
    type: 'email' | 'slack' | 'sms',
    recipient: string,
    message: string
  ): Promise<{ message: string }> {
    return this.post<{ message: string }>('/api/notifications', { type, recipient, message });
  }

  /**
   * Get audit logs
   * @param limit Results per page
   * @param page Page number
   * @param filters Optional filters
   * @returns Audit logs with pagination
   */
  public async getAuditLogs(
    limit: number = 100,
    page: number = 1,
    filters?: { action?: string; user?: string; startDate?: string; endDate?: string }
  ): Promise<Record<string, unknown>> {
    let url = `/api/audit?limit=${limit}&page=${page}`;

    if (filters) {
      if (filters.action) url += `&action=${encodeURIComponent(filters.action)}`;
      if (filters.user) url += `&user=${encodeURIComponent(filters.user)}`;
      if (filters.startDate) url += `&startDate=${encodeURIComponent(filters.startDate)}`;
      if (filters.endDate) url += `&endDate=${encodeURIComponent(filters.endDate)}`;
    }

    return this.get<Record<string, unknown>>(url);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
