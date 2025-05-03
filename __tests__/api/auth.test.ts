import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { RequestCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { RequestCookies } from 'next/dist/server/web/spec-extension/cookies';
import { NextRequest } from 'next/server';
import { DELETE, POST } from '../../app/api/auth/route';
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

// Create a mock for cookies function
const mockCookiesSet = jest.fn();
const mockCookiesGet = jest.fn();
const mockCookies = {
  set: mockCookiesSet,
  get: mockCookiesGet,
};

// Mock cookies function
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => mockCookies),
  headers: jest.fn(() => ({
    get: jest.fn((name: string) => ({ name, value: 'mock-value' } as RequestCookie)),
  })),
}));

// Helper function to create a mock request
function createMockRequest(body: Record<string, unknown>): NextRequest {
  // Create a mock RequestCookies object with the correct method signatures
  const cookiesObj = {
    get: jest.fn((name: string) => ({ name, value: 'mock-value' } as unknown as RequestCookie | undefined)),
    getAll: jest.fn(() => []),
    has: jest.fn(() => false),
    // For delete, handle single string or array of strings correctly
    delete: jest.fn((names: string | string[]): boolean => {
      return true; // Always return boolean, not an array
    }),
    // For clear and set, return the cookies object for chaining
    clear: jest.fn(),
    set: jest.fn(),
    // Use Object.defineProperty for read-only size property
    [Symbol.iterator]: jest.fn(() => [][Symbol.iterator]()),
  };

  // Define size as a getter (read-only property)
  Object.defineProperty(cookiesObj, 'size', {
    get: () => 0,
    enumerable: true,
    configurable: true,
  });

  // Set up clear and set to return the cookies object for chaining
  cookiesObj.clear.mockReturnValue(cookiesObj);
  cookiesObj.set.mockReturnValue(cookiesObj);
  const mockRequest: Partial<NextRequest> = {
    json: jest.fn<() => Promise<Record<string, unknown>>>().mockResolvedValue(body),
    cookies: cookiesObj as unknown as RequestCookies,
    headers: {
      get: jest.fn((name: string) => 'mock-value'),
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
 
      // Verify that cookies.set was called with appropriate parameters to clear the token
      expect(mockCookiesSet).toHaveBeenCalledWith('token', '', expect.objectContaining({
        maxAge: 0,
      }));
    });
  });
});