import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { POST, DELETE } from '../../app/api/auth/route';
import { NextRequest } from 'next/server';
import '../setup';

// Mock findUserByUsername and verifyUserCredentials
jest.mock('../../lib/auth/auth-service', () => ({
  authService: {
    findUserByUsername: jest.fn(async (username) => {
      if (username === 'admin') {
        return { id: '1', username: 'admin', role: 'admin' };
      }
      return null;
    }),
    verifyUserCredentials: jest.fn(async (username, password) => {
      return username === 'admin' && password === 'admin123';
    }),
    generateToken: jest.fn(() => 'mock-token'),
  },
}));

// Mock logToAuditTrail function
jest.mock('../../app/api/_utils/audit', () => ({
  createLogEntry: jest.fn(() => ({})),
  logToAuditTrail: jest.fn(),
}));

// Mock cookies function
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    set: jest.fn(),
    get: jest.fn(),
  })),
  headers: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

// Helper function to create a mock request
function createMockRequest(body: Record<string, unknown>): NextRequest {
  return {
    json: jest.fn<() => Promise<Record<string, unknown>>>().mockResolvedValue(body),
    cookies: {
      get: jest.fn(),
      set: jest.fn(),
    },
    headers: {
      get: jest.fn(),
    },
  } as unknown as NextRequest;
}

describe('Auth API', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('POST /api/auth (login)', () => {
    test('should authenticate a user with valid credentials', async () => {
      // Create mock request
      const request = createMockRequest({
        username: 'admin',
        password: 'admin123'
      });
      
      // Execute the handler
      const response = await POST(request);
      
      // Parse the JSON response
      const data = await response.json();
      
      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
      expect(data.user).toHaveProperty('username', 'admin');
    });

    test('should reject invalid credentials', async () => {
      // Create mock request with invalid password
      const request = createMockRequest({
        username: 'admin',
        password: 'wrong-password'
      });
      
      // Execute the handler
      const response = await POST(request);
      
      // Parse the JSON response
      const data = await response.json();
      
      // Assertions
      expect(response.status).toBe(401);
      expect(data).toHaveProperty('message', 'Invalid username or password');
    });

    test('should reject non-existent user', async () => {
      // Create mock request with non-existent user
      const request = createMockRequest({
        username: 'non-existent',
        password: 'password'
      });
      
      // Execute the handler
      const response = await POST(request);
      
      // Parse the JSON response
      const data = await response.json();
      
      // Assertions
      expect(response.status).toBe(401);
      expect(data).toHaveProperty('message', 'Invalid username or password');
    });

    test('should validate required fields', async () => {
      // Create mock request with missing username
      const request1 = createMockRequest({
        password: 'admin123'
      });
      
      // Execute the handler
      const response1 = await POST(request1);
      
      // Parse the JSON response
      const data1 = await response1.json();
      
      // Assertions
      expect(response1.status).toBe(400);
      expect(data1.message).toContain('Username');
      
      // Create mock request with missing password
      const request2 = createMockRequest({
        username: 'admin'
      });
      
      // Execute the handler
      const response2 = await POST(request2);
      
      // Parse the JSON response
      const data2 = await response2.json();
      
      // Assertions
      expect(response2.status).toBe(400);
      expect(data2.message).toContain('Password');
    });
  });

  describe('DELETE /api/auth (logout)', () => {
    test('should log out a user successfully', async () => {
      // Execute the handler
      const response = await DELETE();
      
      // Parse the JSON response
      const data = await response.json();
      
      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('message', 'Logged out successfully');
    });
  });
});