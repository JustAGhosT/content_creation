/**
 * Health Check API Tests
 * Tests for /api/health endpoint
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/health/route';

// Type definitions matching the health route response
interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  message?: string;
  lastChecked: string;
}

// Helper function to create a mock request
function createMockRequest(url: string): NextRequest {
  // Create a type-safe mock for Headers
  const mockHeaders = {
    get: jest.fn((_name: string) => null),
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
  } as unknown as Headers;

  const mockRequest: Partial<NextRequest> = {
    url,
    headers: mockHeaders,
  };
  return mockRequest as NextRequest;
}

describe('GET /api/health', () => {
  // Store original env vars
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Quick health check (without detailed parameter)', () => {
    it('should return 200 status with healthy response', async () => {
      const request = createMockRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('commit');
      expect(data).toHaveProperty('builtAt');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('environment');
      expect(data).not.toHaveProperty('components');
      expect(data).not.toHaveProperty('details');
    });

    it('should expose the exact artifact build stamp', async () => {
      process.env.OMNIPOST_VERSION = '2.3.4';
      process.env.OMNIPOST_COMMIT = '0123456789abcdef0123456789abcdef01234567';
      process.env.OMNIPOST_BUILT_AT = '2026-08-09T16:00:00.000Z';
      process.env.OMNIPOST_ENVIRONMENT = 'dev';

      const request = createMockRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data).toMatchObject({
        version: '2.3.4',
        commit: '0123456789abcdef0123456789abcdef01234567',
        builtAt: '2026-08-09T16:00:00.000Z',
        environment: 'dev',
      });
    });

    it('should return 200 even when JWT_SECRET is missing', async () => {
      // Remove JWT_SECRET from environment
      delete process.env.JWT_SECRET;

      const request = createMockRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
    });

    it('should return 200 even when NEXT_PUBLIC_API_URL is missing', async () => {
      // Remove NEXT_PUBLIC_API_URL from environment
      delete process.env.NEXT_PUBLIC_API_URL;

      const request = createMockRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
    });

    it('should return 200 even when both optional vars are missing', async () => {
      // Remove both optional environment variables
      delete process.env.JWT_SECRET;
      delete process.env.NEXT_PUBLIC_API_URL;

      const request = createMockRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
    });

    it('should have cache-control header set to no-store', async () => {
      const request = createMockRequest('http://localhost:3000/api/health');
      const response = await GET(request);

      expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    });

    it('should return current environment', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      try {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: 'production',
          configurable: true,
          writable: true,
        });

        const request = createMockRequest('http://localhost:3000/api/health');
        const response = await GET(request);
        const data = await response.json();

        expect(data.environment).toBe('production');
      } finally {
        // Ensure original value is restored even if test fails
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: originalNodeEnv,
          configurable: true,
          writable: true,
        });
      }
    });
  });

  describe('Detailed health check (with detailed=true)', () => {
    it('should return detailed health information', async () => {
      const request = createMockRequest('http://localhost:3000/api/health?detailed=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('components');
      expect(data).toHaveProperty('details');
      expect(data.components).toBeInstanceOf(Array);
      expect(data.components.length).toBeGreaterThan(0);
    });

    it('should include component health checks', async () => {
      const request = createMockRequest('http://localhost:3000/api/health?detailed=true');
      const response = await GET(request);
      const data = await response.json();

      const componentNames = data.components.map((c: ComponentHealth) => c.name);
      expect(componentNames).toContain('feature-flags');
      expect(componentNames).toContain('memory');
      expect(componentNames).toContain('environment');
    });

    it('should include memory details', async () => {
      const request = createMockRequest('http://localhost:3000/api/health?detailed=true');
      const response = await GET(request);
      const data = await response.json();

      expect(data.details).toHaveProperty('memory');
      expect(data.details.memory).toHaveProperty('used');
      expect(data.details.memory).toHaveProperty('total');
      expect(data.details.memory).toHaveProperty('percentage');
    });

    it('should include feature flags details', async () => {
      const request = createMockRequest('http://localhost:3000/api/health?detailed=true');
      const response = await GET(request);
      const data = await response.json();

      expect(data.details).toHaveProperty('featureFlags');
      expect(data.details.featureFlags).toHaveProperty('enabled');
      expect(data.details.featureFlags).toHaveProperty('total');
    });

    it('should report degraded status when optional config is missing', async () => {
      // Remove optional environment variables
      delete process.env.JWT_SECRET;
      delete process.env.NEXT_PUBLIC_API_URL;

      const request = createMockRequest('http://localhost:3000/api/health?detailed=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200); // Still returns 200, but status is degraded
      expect(data.status).toBe('degraded');

      const envComponent = data.components.find((c: ComponentHealth) => c.name === 'environment');
      expect(envComponent).toBeDefined();
      expect(envComponent.status).toBe('degraded');
      expect(envComponent.message).toContain('Optional configuration missing');
    });

    it('should report healthy status when all config is present', async () => {
      // Set optional environment variables
      process.env.JWT_SECRET = 'test-secret-key';
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';

      // Force Jest to reload the module to pick up new env vars
      jest.resetModules();

      const request = createMockRequest('http://localhost:3000/api/health?detailed=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Note: status might still be degraded due to other components
      // but environment component should be healthy

      const envComponent = data.components.find((c: ComponentHealth) => c.name === 'environment');
      expect(envComponent).toBeDefined();
      expect(envComponent.status).toBe('healthy');
      expect(envComponent.message).toBe('All configuration present');
    });

    it('should have cache-control header set to no-store', async () => {
      const request = createMockRequest('http://localhost:3000/api/health?detailed=true');
      const response = await GET(request);

      expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    });
  });

  describe('Component health checks', () => {
    it('should check all components have required properties', async () => {
      const request = createMockRequest('http://localhost:3000/api/health?detailed=true');
      const response = await GET(request);
      const data = await response.json();

      data.components.forEach((component: ComponentHealth) => {
        expect(component).toHaveProperty('name');
        expect(component).toHaveProperty('status');
        expect(component).toHaveProperty('message');
        expect(component).toHaveProperty('lastChecked');
        expect(['healthy', 'degraded', 'unhealthy']).toContain(component.status);
      });
    });
  });
});
