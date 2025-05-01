import { describe, expect, test, jest, beforeAll, afterAll } from '@jest/globals';
import { createServer } from 'http';
import { apiResolver } from 'next/dist/server/api-utils/node';
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

describe('API Integration Tests', () => {
  let server: any;
  let baseUrl: string;
  let authToken: string;

  // Start a test server before all tests
  beforeAll(async () => {
    // Create a test server
    server = createServer((req, res) => {
      // Route the request to the appropriate handler based on the path
      const { url } = req;
      
      if (url?.startsWith('/api/auth')) {
        return apiResolver(
          req,
          res,
          {},
          require('../../app/api/auth/route'),
          { previewModeId: '', previewModeEncryptionKey: '', previewModeSigningKey: '' },
          false
        );
      } else if (url?.startsWith('/api/feature-flags')) {
        return apiResolver(
          req,
          res,
          {},
          require('../../app/api/feature-flags/route'),
          { previewModeId: '', previewModeEncryptionKey: '', previewModeSigningKey: '' },
          false
        );
      } else if (url?.startsWith('/api/platforms')) {
        return apiResolver(
          req,
          res,
          {},
          require('../../app/api/platforms/route'),
          { previewModeId: '', previewModeEncryptionKey: '', previewModeSigningKey: '' },
          false
        );
      } else if (url?.startsWith('/api/images')) {
        return apiResolver(
          req,
          res,
          {},
          require('../../app/api/images/route'),
          { previewModeId: '', previewModeEncryptionKey: '', previewModeSigningKey: '' },
          false
        );
      } else {
        res.statusCode = 404;
        res.end('Not Found');
      }
    });

    // Start the server on a random port
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        baseUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });

    // Login to get an auth token
    const loginResponse = await fetch(`${baseUrl}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const loginData = await loginResponse.json();
    authToken = loginData.token;
  });

  // Close the server after all tests
  afterAll(() => {
    server.close();
  });

  // Test a complete user flow
  test('Complete user flow: login, get platforms, update feature flag', async () => {
    // Step 1: Get platforms
    const platformsResponse = await fetch(`${baseUrl}/api/platforms`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    expect(platformsResponse.status).toBe(200);
    const platforms = await platformsResponse.json();
    expect(Array.isArray(platforms)).toBe(true);
    
    // Step 2: Get feature flags
    const featureFlagsResponse = await fetch(`${baseUrl}/api/feature-flags`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    expect(featureFlagsResponse.status).toBe(200);
    const featureFlags = await featureFlagsResponse.json();
    expect(featureFlags).toHaveProperty('imageGeneration');
    
    // Step 3: Update a feature flag
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
    const updateResult = await updateResponse.json();
    expect(updateResult).toHaveProperty('message', 'Feature flag updated successfully');
    
    // Step 4: Generate an image (if feature is enabled)
    if (featureFlags.imageGeneration) {
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
      const imageResult = await imageResponse.json();
      expect(imageResult).toHaveProperty('url');
    }
    
    // Step 5: Logout
    const logoutResponse = await fetch(`${baseUrl}/api/auth`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    expect(logoutResponse.status).toBe(200);
    const logoutResult = await logoutResponse.json();
    expect(logoutResult).toHaveProperty('message', 'Logged out successfully');
  });
});