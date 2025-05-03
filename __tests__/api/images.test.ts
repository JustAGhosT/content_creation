import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { NextResponse } from 'next/server';

// Mock the HuggingFaceClient before importing the route handlers
jest.mock('../../lib/clients/huggingface', () => ({
  HuggingFaceClient: jest.fn().mockImplementation(() => ({
    generateImage: jest.fn().mockResolvedValue({
      data: { url: 'https://example.com/generated-image.jpg' }
    }),
    approveImage: jest.fn().mockResolvedValue({
      success: true,
      message: 'Image approved successfully'
    }),
    rejectImage: jest.fn().mockResolvedValue({
      success: true,
      message: 'Image rejected successfully'
    }),
    regenerateImage: jest.fn().mockResolvedValue({
      data: { url: 'https://example.com/regenerated-image.jpg' }
    })
  }))
}));

// Mock authentication functions
jest.mock('../../app/api/_utils/auth', () => ({
  isAuthenticated: jest.fn(() => true)
}));

// Mock audit logging functions
jest.mock('../../app/api/_utils/audit', () => ({
  createLogEntry: jest.fn(() => ({})),
  logToAuditTrail: jest.fn()
}));

// Mock feature flags
jest.mock('../../utils/featureFlags', () => ({
  __esModule: true,
  default: {
    imageGeneration: true
  }
}));

// Import the route handlers after mocking dependencies
import { POST, PUT } from '../../app/api/images/route';

describe('Images API', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset the authentication mock to return true by default
    const { isAuthenticated } = require('../../app/api/_utils/auth');
    isAuthenticated.mockImplementation(() => true);
    
    // Reset the feature flags mock to enable image generation by default
    jest.mock('../../utils/featureFlags', () => ({
      __esModule: true,
      default: {
        imageGeneration: true
      }
    }));
  });

  describe('POST /api/images (generate image)', () => {
    test('should generate an image with valid context', async () => {
      // Create mock request
      const request = {
        json: jest.fn().mockResolvedValue({
          context: 'A beautiful sunset over mountains'
        })
      };
      
      // Execute the handler
      const response = await POST(request as any);
      
      // Parse the JSON response
      const data = await response.json();
      
      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('url', 'https://example.com/generated-image.jpg');
    });

    test('should validate context', async () => {
      // Create mock request with empty context
      const request = {
        json: jest.fn().mockResolvedValue({
          context: ''
        })
      };
      
      // Execute the handler
      const response = await POST(request as any);
      
      // Parse the JSON response
      const data = await response.json();
      
      // Assertions
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('message');
      expect(data.message).toContain('Context');
    });

    test('should require authentication', async () => {
      // Mock isAuthenticated to return false
      const { isAuthenticated } = require('../../app/api/_utils/auth');
      isAuthenticated.mockReturnValueOnce(false);
      
      // Create mock request
      const request = {
        json: jest.fn().mockResolvedValue({
          context: 'A beautiful sunset over mountains'
        })
      };
      
      // Execute the handler
      const response = await POST(request as any);
      
      // Parse the JSON response
      const data = await response.json();
      
      // Assertions
      expect(response.status).toBe(401);
      expect(data).toHaveProperty('message', 'Authentication required to generate images');
    });

    test('should check if image generation is enabled', async () => {
      // Mock feature flags to disable image generation
      jest.resetModules();
      jest.mock('../../utils/featureFlags', () => ({
        __esModule: true,
        default: {
          imageGeneration: false
        }
      }));
      
      // Re-import the POST handler to use the updated mock
      const { POST } = require('../../app/api/images/route');
      
      // Create mock request
      const request = {
        json: jest.fn().mockResolvedValue({
          context: 'A beautiful sunset over mountains'
        })
      };
      
      // Execute the handler
      const response = await POST(request as any);
      
      // Parse the JSON response
      const data = await response.json();
      
      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty('message', 'Image generation feature is disabled');
    });
  });

  describe('PUT /api/images (review image)', () => {
    test('should approve an image', async () => {
      // Create mock request for approval
      const request = {
        json: jest.fn().mockResolvedValue({
          image: { id: '123', url: 'https://example.com/image.jpg' },
          action: 'approve'
        })
      };
      
      // Execute the handler
      const response = await PUT(request as any);
      
      // Parse the JSON response
      const data = await response.json();
      
      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('message', 'Image approved successfully');
    });

    test('should reject an image', async () => {
      // Create mock request for rejection
      const request = {
        json: jest.fn().mockResolvedValue({
          image: { id: '123', url: 'https://example.com/image.jpg' },
          action: 'reject'
        })
      };
      
      // Execute the handler
      const response = await PUT(request as any);
      
      // Parse the JSON response
      const data = await response.json();
      
      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('message', 'Image rejected successfully');
    });

    test('should regenerate an image', async () => {
      // Create mock request for regeneration
      const request = {
        json: jest.fn().mockResolvedValue({
          image: { 
            id: '123', 
            url: 'https://example.com/image.jpg',
            context: 'A beautiful sunset over mountains'
          },
          action: 'regenerate'
        })
      };
      
      // Execute the handler
      const response = await PUT(request as any);
      
      // Parse the JSON response
      const data = await response.json();
      
      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('url', 'https://example.com/regenerated-image.jpg');
    });

    test('should validate action', async () => {
      // Create mock request with invalid action
      const request = {
        json: jest.fn().mockResolvedValue({
          image: { id: '123', url: 'https://example.com/image.jpg' },
          action: 'invalid-action'
        })
      };
      
      // Execute the handler
      const response = await PUT(request as any);
      
      // Parse the JSON response
      const data = await response.json();
      
      // Assertions
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('message');
      expect(data.message).toContain('Invalid action');
    });

    test('should require context for regeneration', async () => {
      // Create mock request missing context for regeneration
      const request = {
        json: jest.fn().mockResolvedValue({
          image: { id: '123', url: 'https://example.com/image.jpg' },
          action: 'regenerate'
        })
      };
      
      // Execute the handler
      const response = await PUT(request as any);
      
      // Parse the JSON response
      const data = await response.json();
      
      // Assertions
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('message', 'Context is required for regeneration');
    });
  });
});