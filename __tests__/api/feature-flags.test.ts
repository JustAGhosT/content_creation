import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { GET, POST } from '../../app/api/feature-flags/route';
import '../setup';

// Mock isAdmin function
jest.mock('../../app/api/_utils/auth', () => ({
  isAdmin: jest.fn(() => true),
}));

// Mock logToAuditTrail function
jest.mock('../../app/api/_utils/audit', () => ({
  createLogEntry: jest.fn(() => ({})),
  logToAuditTrail: jest.fn(),
}));

describe('Feature Flags API', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /api/feature-flags', () => {
    test('should return all feature flags', async () => {
      // Execute the handler
      const response = await GET();
      
      // Parse the JSON response
      const data = await response.json();
      
      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('textParser');
      expect(data.textParser).toHaveProperty('enabled', true);
      expect(data.textParser).toHaveProperty('implementation', 'openai');
      expect(data).toHaveProperty('imageGeneration', true);
      expect(data).toHaveProperty('summarization', true);
    });
  });

  describe('POST /api/feature-flags', () => {
    test('should update a feature flag', async () => {
      // Create mock request
      const request = createMockRequest('POST', {
        feature: 'imageGeneration',
        enabled: false
      });
      
      // Execute the handler
      const response = await POST(request);
      
      // Parse the JSON response
      const data = await response.json();
      
      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('message', 'Feature flag updated successfully');
      expect(data).toHaveProperty('feature', 'imageGeneration');
      expect(data).toHaveProperty('enabled', false);
    });

    test('should validate feature name', async () => {
      // Create mock request with invalid feature name
      const request = createMockRequest('POST', {
        feature: '',
        enabled: false
      });
      
      // Execute the handler
      const response = await POST(request);
      
      // Parse the JSON response
      const data = await response.json();
      
      // Assertions
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('message');
      expect(data.message).toContain('Feature name');
    });

    test('should validate enabled flag', async () => {
      // Create mock request with invalid enabled value
      const request = createMockRequest('POST', {
        feature: 'imageGeneration',
        enabled: 'not-a-boolean'
      });
      
      // Execute the handler
      const response = await POST(request);
      
      // Parse the JSON response
      const data = await response.json();
      
      // Assertions
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('message');
      expect(data.message).toContain('Enabled flag');
    });

    test('should validate implementation for textParser', async () => {
      // Create mock request with invalid implementation
      const request = createMockRequest('POST', {
        feature: 'textParser',
        enabled: true,
        implementation: 'invalid-implementation'
      });
      
      // Execute the handler
      const response = await POST(request);
      
      // Parse the JSON response
      const data = await response.json();
      
      // Assertions
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('message');
      expect(data.message).toContain('Implementation');
    });

    test('should require admin privileges', async () => {
      // Mock isAdmin to return false
      const { isAdmin } = require('../../app/api/_utils/auth');
      (isAdmin as jest.Mock).mockReturnValueOnce(false);
      
      // Create mock request
      const request = createMockRequest('POST', {
        feature: 'imageGeneration',
        enabled: false
      });
      
      // Execute the handler
      const response = await POST(request);
      
      // Parse the JSON response
      const data = await response.json();
      
      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty('message', 'Admin privileges required to update feature flags');
    });
  });
});