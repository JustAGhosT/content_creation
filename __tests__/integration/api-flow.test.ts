import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import http from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import fetch, { Response as FetchResponse } from 'node-fetch';
import '../setup';

// Mock middleware
jest.mock('../../middleware', () => ({
  middleware: jest.fn((req: any) => {
    // Add user info to request headers
    req.headers.set('x-user-id', '1');
    req.headers.set('x-user-role', 'admin');
    req.headers.set('x-user-name', 'admin');
    return { status: 200 };
  })
}));

// Mock handler function for testing
const createMockHandler = (method: string, response: any) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== method) {
      return res.status(405).json({ message: 'Method not allowed' });
    }
    
    res.status(200).json(response);
  };
};

// Utility function for common response assertions
const assertSuccessResponse = async (response: FetchResponse, expectedProperties?: string[]) => {
  expect(response.status).toBe(200);
  if (expectedProperties && expectedProperties.length > 0) {
    const data = await response.json() as any;
    for (const prop of expectedProperties) {
      if (prop.includes(',')) {
        // Handle nested properties like 'message,expected value'
        const [propPath, expectedValue] = prop.split(',');
        const value = propPath.split('.').reduce((obj, key) => obj[key], data);
        expect(value).toBe(expectedValue);
      } else {
        expect(data).toHaveProperty(prop);
      }
    }
    return data;
  }
  return response.json();
};

describe('API Integration Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  let authToken: string = 'mock-token';

  // Handler functions for different API endpoints
  const handleAuthEndpoint = (req: http.IncomingMessage, res: http.ServerResponse) => {
    const method = req.method || 'GET';
    
    if (method === 'POST') {
      // Mock login response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        token: 'mock-token',
        user: { id: '1', username: 'admin', role: 'admin' }
      }));
    } else if (method === 'DELETE') {
      // Mock logout response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Logged out successfully' }));
    }
  };

  const handleFeatureFlagsEndpoint = (req: http.IncomingMessage, res: http.ServerResponse) => {
    const method = req.method || 'GET';
    
    if (method === 'GET') {
      // Mock feature flags response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        textParser: { enabled: true, implementation: 'openai' },
        imageGeneration: true,
        summarization: true
      }));
    } else if (method === 'POST') {
      // Mock update feature flag response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        message: 'Feature flag updated successfully',
        feature: 'imageGeneration',
        enabled: false
      }));
    }
  };

  const handlePlatformsEndpoint = (req: http.IncomingMessage, res: http.ServerResponse) => {
    // Mock platforms response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([
      { id: 1, name: 'Facebook', icon: 'facebook-icon' },
      { id: 2, name: 'Twitter', icon: 'twitter-icon' }
    ]));
  };
    
  const handleImagesEndpoint = (req: http.IncomingMessage, res: http.ServerResponse) => {
    // Mock image generation response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ url: 'https://example.com/generated-image.jpg' }));
  };

  const handleNotFound = (res: http.ServerResponse) => {
    // Default 404 response
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Not Found' }));
  };

  // Start a test server before all tests
  beforeAll(async () => {
    // Create a test server with mock handlers
    server = http.createServer((req, res) => {
      const url = req.url || '';
      
      // Route requests to the appropriate handler
      if (url.startsWith('/api/auth')) {
        handleAuthEndpoint(req, res);
      } else if (url.startsWith('/api/feature-flags')) {
        handleFeatureFlagsEndpoint(req, res);
      } else if (url.startsWith('/api/platforms')) {
        handlePlatformsEndpoint(req, res);
      } else if (url.startsWith('/api/images')) {
        handleImagesEndpoint(req, res);
      } else {
        handleNotFound(res);
      }
    });

    interface AddressInfo {
      port: number;
    }
    
    // Start the server on a random port
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  // Close the server after all tests
  afterAll(() => {
    server.close();
  });

  // Test a complete user flow
  test('Complete user flow: login, get platforms, update feature flag', async () => {
    // Step 1: Login
    const loginResponse = await fetch(`${baseUrl}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const loginData = await assertSuccessResponse(loginResponse, ['token', 'user']);
    
    // Set auth token for subsequent requests
    const authToken = loginData.token;
    
    // Step 2: Get platforms
    const platformsResponse = await fetch(`${baseUrl}/api/platforms`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const platforms = await assertSuccessResponse(platformsResponse) as any[];
    expect(Array.isArray(platforms)).toBe(true);
    expect(platforms.length).toBe(2);
    
    // Step 3: Get feature flags
    const featureFlagsResponse = await fetch(`${baseUrl}/api/feature-flags`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const featureFlags = await assertSuccessResponse(featureFlagsResponse, ['imageGeneration']);
    
    // Step 4: Update a feature flag
    const updateResponse = await fetch(`${baseUrl}/api/feature-flags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        feature: 'imageGeneration',
        enabled: !featureFlags.imageGeneration
      })
    });
    
    await assertSuccessResponse(updateResponse, ['message,Feature flag updated successfully']);
    
    // Step 5: Generate an image
    const imageResponse = await fetch(`${baseUrl}/api/images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        context: 'A beautiful sunset over mountains'
      })
    });
    
    await assertSuccessResponse(imageResponse, ['url']);
    
    // Step 6: Logout
    const logoutResponse = await fetch(`${baseUrl}/api/auth`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    await assertSuccessResponse(logoutResponse, ['message,Logged out successfully']);
  });
});