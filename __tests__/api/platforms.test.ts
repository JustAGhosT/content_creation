import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET as getPlatformCapabilities } from '../../app/api/platforms/[id]/capabilities/route';
import { GET as getPlatforms } from '../../app/api/platforms/route';
import '../setup';

// Define valid platform names type
type PlatformName = 'facebook' | 'twitter' | 'linkedin';

// Mock platforms data
jest.mock('../../lib/config/platforms', () => ({
  platforms: [
    { id: 1, name: 'Facebook', icon: 'facebook-icon' },
    { id: 2, name: 'Twitter', icon: 'twitter-icon' },
    { id: 3, name: 'LinkedIn', icon: 'linkedin-icon' },
  ],
  getPlatformConfig: jest.fn((name: string) => {
    const configs: Record<
      PlatformName,
      {
        apiUrl: string;
        apiKey: string;
        capabilities: string[];
      }
    > = {
      facebook: {
        apiUrl: 'https://api.facebook.com',
        apiKey: 'facebook-api-key',
        capabilities: ['post', 'image', 'video'],
      },
      twitter: {
        apiUrl: 'https://api.twitter.com',
        apiKey: 'twitter-api-key',
        capabilities: ['post', 'image'],
      },
      linkedin: {
        apiUrl: 'https://api.linkedin.com',
        apiKey: 'linkedin-api-key',
        capabilities: ['post', 'article'],
      },
    };

    const platformName = name.toLowerCase() as PlatformName;
    return configs[platformName] || null;
  }),
}));

// Mock authentication functions
jest.mock('../../app/api/_utils/auth', () => ({
  isAuthenticated: jest.fn(() => Promise.resolve(true)),
}));

// Mock audit logging functions
jest.mock('../../app/api/_utils/audit', () => ({
  createLogEntry: jest.fn(() => ({})),
  logToAuditTrail: jest.fn(),
}));

// Helper function to create a mock request
function createMockRequest(method: string = 'GET'): NextRequest {
  const mockRequest: Partial<NextRequest> = {
    method,
    headers: {
      get: jest.fn((_name: string) => 'mock-value'),
      append: jest.fn(),
      delete: jest.fn(),
      has: jest.fn(() => false),
      set: jest.fn(),
      entries: jest.fn(() => [][Symbol.iterator]()),
      forEach: jest.fn(),
      keys: jest.fn(() => [][Symbol.iterator]()),
      values: jest.fn(() => [][Symbol.iterator]()),
      getSetCookie: jest.fn(() => []),
      [Symbol.iterator]: jest.fn(() => [][Symbol.iterator]()),
    },
  };
  return mockRequest as NextRequest;
}

// Helper function to mock unauthenticated headers
function mockUnauthenticatedHeaders(): void {
  const { headers } = require('next/headers');
  const mockHeaderGet = (name: string) => {
    if (name === 'x-user-id') return null; // No user ID = not authenticated
    return null;
  };
  headers.mockImplementationOnce(() => ({
    get: jest.fn(mockHeaderGet),
  }));
}

describe('Platforms API', () => {
  beforeEach(() => {
    // Reset mock implementations before each test
    const { isAuthenticated } = require('../../app/api/_utils/auth');
    isAuthenticated.mockClear();
    isAuthenticated.mockImplementation(() => Promise.resolve(true));
  });

  describe('GET /api/platforms', () => {
    test('should return all platforms', async () => {
      // Create a mock request
      const request = createMockRequest();

      // Execute the handler
      const response = await getPlatforms(request);

      // Parse the JSON response
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(7); // Includes TikTok, Pinterest Sandbox, and custom channel
      expect(data[0]).toHaveProperty('id', 1);
      expect(data[0]).toHaveProperty('name', 'Facebook');
      expect(data[1]).toHaveProperty('name', 'Instagram'); // Updated order
      expect(data).toContainEqual(
        expect.objectContaining({
          name: 'Pinterest Sandbox',
          slug: 'pinterest',
          comingSoon: true,
          requiresMedia: true,
        })
      );
      expect(data[2]).toHaveProperty('name', 'LinkedIn');
      expect(data[4]).toHaveProperty('name', 'TikTok');
    });

    test('should require authentication', async () => {
      // Mock headers to return no user ID (unauthenticated)
      mockUnauthenticatedHeaders();

      // Create a mock request
      const request = createMockRequest();

      // Execute the handler
      const response = await getPlatforms(request);

      // Parse the JSON response
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(401);
      expect(data).toHaveProperty('message', 'Authentication required');
    });
  });

  describe('GET /api/platforms/[id]/capabilities', () => {
    test('should return capabilities for a valid platform', async () => {
      // Create mock request and params
      const request = createMockRequest();
      const params = { params: Promise.resolve({ id: '1' }) };

      // Execute the handler
      const response = await getPlatformCapabilities(request, params);

      // Parse the JSON response
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('platform');
      expect(data).toHaveProperty('capabilities');
      expect(data.platform).toHaveProperty('id', 1);
      expect(data.platform).toHaveProperty('name', 'Facebook');
      expect(Array.isArray(data.capabilities)).toBe(true);
      expect(data.capabilities).toContain('text'); // Updated from 'post' to 'text'
      expect(data.capabilities).toContain('image');
      expect(data.capabilities).toContain('video');
    });

    test('should handle invalid platform ID', async () => {
      // Create mock request and params
      const request = createMockRequest();
      const params = { params: Promise.resolve({ id: 'invalid' }) };

      // Execute the handler
      const response = await getPlatformCapabilities(request, params);

      // Parse the JSON response
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('message', 'Invalid platform ID');
    });

    test('should handle non-existent platform', async () => {
      // Create mock request and params
      const request = createMockRequest();
      const params = { params: Promise.resolve({ id: '99' }) };

      // Execute the handler
      const response = await getPlatformCapabilities(request, params);

      // Parse the JSON response
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(404);
      expect(data).toHaveProperty('message', 'Platform not found');
    });

    test('should require authentication', async () => {
      // Mock headers to return no user ID (unauthenticated)
      mockUnauthenticatedHeaders();

      // Create mock request and params
      const request = createMockRequest();
      const params = { params: Promise.resolve({ id: '1' }) };

      // Execute the handler
      const response = await getPlatformCapabilities(request, params);

      // Parse the JSON response
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(401);
      expect(data).toHaveProperty(
        'message',
        'Authentication required to access platform capabilities'
      );
    });
  });
});
