// Test for the API client
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// Mock axios module
const mockAxiosGet = jest.fn();
const mockAxiosPost = jest.fn();
const mockAxiosPut = jest.fn();
const mockAxiosDelete = jest.fn();

// Mock axios with a simpler approach
jest.mock('axios', () => {
  return {
    create: () => ({
      get: mockAxiosGet,
      post: mockAxiosPost,
      put: mockAxiosPut,
      delete: mockAxiosDelete,
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    })
  };
});

// Create a mock for localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Set up global window object with localStorage mock
Object.defineProperty(global, 'window', {
  value: {
    localStorage: localStorageMock,
    location: { href: '' }
  },
  writable: true
});

// Import the API client after mocking
jest.isolateModules(() => {
  // This ensures the module is loaded fresh with our mocks in place
  require('../../lib/api-client');
});

// Re-import the API client to get the instance with our mocks
const { apiClient } = require('../../lib/api-client');

describe('API Client', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  test('getPlatforms should fetch platforms from the API', async () => {
    // Mock the axios get method to return a successful response
    const mockPlatforms = [
      { id: 1, name: 'Facebook', icon: 'facebook-icon' },
      { id: 2, name: 'Twitter', icon: 'twitter-icon' }
    ];
    
    mockAxiosGet.mockResolvedValueOnce({ data: mockPlatforms });
    
    // Call the method
    const result = await apiClient.getPlatforms();
    
    // Assertions - check that the function was called with the correct first argument
    expect(mockAxiosGet).toHaveBeenCalled();
    expect(mockAxiosGet.mock.calls[0][0]).toBe('/api/platforms');
    expect(result).toEqual(mockPlatforms);
  });

  test('getFeatureFlags should fetch feature flags from the API', async () => {
    // Mock the axios get method to return a successful response
    const mockFeatureFlags = {
      textParser: {
        enabled: true,
        implementation: 'openai',
      },
      imageGeneration: true
    };
    
    mockAxiosGet.mockResolvedValueOnce({ data: mockFeatureFlags });
    
    // Call the method
    const result = await apiClient.getFeatureFlags();
    
    // Assertions - check that the function was called with the correct first argument
    expect(mockAxiosGet).toHaveBeenCalled();
    expect(mockAxiosGet.mock.calls[0][0]).toBe('/api/feature-flags');
    expect(result).toEqual(mockFeatureFlags);
  });

  test('login should authenticate a user and store the token', async () => {
    // Mock the axios post method to return a successful response
    const mockLoginResponse = {
      token: 'mock-token',
      user: { id: '1', username: 'admin', role: 'admin' }
    };
    
    mockAxiosPost.mockResolvedValueOnce({ data: mockLoginResponse });
    
    // Call the method
    const result = await apiClient.login('admin', 'admin123');
    
    // Assertions - check that the function was called with the correct arguments
    expect(mockAxiosPost).toHaveBeenCalled();
    expect(mockAxiosPost.mock.calls[0][0]).toBe('/api/auth');
    expect(mockAxiosPost.mock.calls[0][1]).toEqual({ username: 'admin', password: 'admin123' });
    expect(result).toEqual(mockLoginResponse);
    
    // Check localStorage directly with individual assertions to verify both key and value
    // This approach provides more granular feedback when tests fail compared to toHaveBeenCalledWith
     expect(localStorageMock.setItem).toHaveBeenCalled();
     const calls = localStorageMock.setItem.mock.calls;
     expect(calls.length).toBeGreaterThan(0);
     expect(calls[0][0]).toBe('auth-token');
     expect(calls[0][1]).toBe('mock-token');
  });

  test('updateFeatureFlag should update a feature flag', async () => {
    // Mock the axios post method to return a successful response
    const mockResponse = { message: 'Feature flag updated successfully' };
    
    mockAxiosPost.mockResolvedValueOnce({ data: mockResponse });
    
    // Call the method
    const result = await apiClient.updateFeatureFlag('imageGeneration', false);
    
    // Assertions - check that the function was called with the correct arguments
    expect(mockAxiosPost).toHaveBeenCalled();
    expect(mockAxiosPost.mock.calls[0][0]).toBe('/api/feature-flags');
    expect(mockAxiosPost.mock.calls[0][1]).toEqual({ feature: 'imageGeneration', enabled: false });
    expect(result).toEqual(mockResponse);
  });

  test('approveQueue should send the queue for approval', async () => {
    // Mock the axios post method to return a successful response
    const mockQueue = [
      { platform: { name: 'Facebook' }, content: { text: 'Test post' } }
    ];
    const mockResponse = { 
      message: 'Queue approved and published successfully',
      results: {
        success: mockQueue,
        failed: []
      }
    };
    
    mockAxiosPost.mockResolvedValueOnce({ data: mockResponse });
    
    // Call the method
    const result = await apiClient.approveQueue(mockQueue);
    
    // Assertions - check that the function was called with the correct arguments
    expect(mockAxiosPost).toHaveBeenCalled();
    expect(mockAxiosPost.mock.calls[0][0]).toBe('/api/queue/approve');
    expect(mockAxiosPost.mock.calls[0][1]).toEqual({ queue: mockQueue });
    expect(result).toEqual(mockResponse);
  });

  test('generateImage should create an image from context', async () => {
    // Mock the axios post method to return a successful response
    const mockResponse = { url: 'https://example.com/generated-image.jpg' };
    
    mockAxiosPost.mockResolvedValueOnce({ data: mockResponse });
    
    // Call the method
    const result = await apiClient.generateImage('A beautiful sunset over mountains');
    
    // Assertions - check that the function was called with the correct arguments
    expect(mockAxiosPost).toHaveBeenCalled();
    expect(mockAxiosPost.mock.calls[0][0]).toBe('/api/images');
    expect(mockAxiosPost.mock.calls[0][1]).toEqual({ context: 'A beautiful sunset over mountains' });
    expect(result).toEqual(mockResponse);
  });
});