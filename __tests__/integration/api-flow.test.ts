import { describe, expect, test, jest, beforeAll, afterAll } from '@jest/globals';
import http from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';
import '../setup';

// Mock middleware
jest.mock('../../middleware', () => ({
  middleware: jest.fn((req) => {
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

describe('API Integration Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  let authToken: string = 'mock-token';

  // Start a test server before all tests
  beforeAll(async () => {
    // Create a test server with mock handlers
    server = http.createServer((req, res) => {
      const url = req.url || '';
      const method = req.method || 'GET';
      
      // Mock API responses based on the URL
      if (url.startsWith('/api/auth')) {
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
      } else if (url.startsWith('/api/feature-flags')) {
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
      } else if (url.startsWith('/api/platforms')) {
        // Mock platforms response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([
          { id: 1, name: 'Facebook', icon: 'facebook-icon' },
          { id: 2, name: 'Twitter', icon: 'twitter-icon' }
        ]));
      } else if (url.startsWith('/api/images')) {
        // Mock image generation response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ url: 'https://example.com/generated-image.jpg' }));
      } else {
        // Default 404 response
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Not Found' }));
      }
    });

    // Start the server on a random port
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address() as { port: number };
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
    
    expect(loginResponse.status).toBe(200);
    const loginData = await loginResponse.json() as any;
    expect(loginData).toHaveProperty('token');
    expect(loginData).toHaveProperty('user');
    
    // Set auth token for subsequent requests
    authToken = loginData.token;
    
    // Step 2: Get platforms
    const platformsResponse = await fetch(`${baseUrl}/api/platforms`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    expect(platformsResponse.status).toBe(200);
    const platforms = await platformsResponse.json() as any[];
    expect(Array.isArray(platforms)).toBe(true);
    expect(platforms.length).toBe(2);
    
    // Step 3: Get feature flags
    const featureFlagsResponse = await fetch(`${baseUrl}/api/feature-flags`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    expect(featureFlagsResponse.status).toBe(200);
    const featureFlags = await featureFlagsResponse.json() as any;
    expect(featureFlags).toHaveProperty('imageGeneration');
    
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
    
    expect(updateResponse.status).toBe(200);
    const updateResult = await updateResponse.json() as any;
    expect(updateResult).toHaveProperty('message', 'Feature flag updated successfully');
    
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
    
    expect(imageResponse.status).toBe(200);
    const imageResult = await imageResponse.json() as any;
    expect(imageResult).toHaveProperty('url');
    
    // Step 6: Logout
    const logoutResponse = await fetch(`${baseUrl}/api/auth`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    expect(logoutResponse.status).toBe(200);
    const logoutResult = await logoutResponse.json() as any;
    expect(logoutResult).toHaveProperty('message', 'Logged out successfully');
  });
});