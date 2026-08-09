/**
 * Proxy (Next.js) Tests
 *
 * Tests for the root `proxy.ts` file (formerly `middleware.ts`). The proxy
 * runs on `/api/:path*` and:
 *
 *   1. Passes non-API paths through (defensive — matcher already filters).
 *   2. On every `/api/*` request: best-effort token extraction. If a valid
 *      JWT is present AND `JWT_SECRET` is set, inject `x-user-id`,
 *      `x-user-role`, `x-user-name` headers from the decoded payload.
 *   3. For paths in `authenticatedPaths`: missing JWT_SECRET -> 401
 *      "Authentication service unavailable...", missing token -> 401
 *      "Authentication required", invalid/expired -> 401 "Invalid or
 *      expired authentication token", valid -> pass through with headers.
 *   4. For paths in `adminPaths`: all of the above PLUS role !== 'admin'
 *      -> 403 "Admin privileges required".
 *   5. For non-protected `/api/*` paths: token failures pass through
 *      silently (no error response).
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Use the real jsonwebtoken implementation so verification logic is
// actually exercised (the global jest.setup.js does not mock jsonwebtoken,
// but be explicit in case any other test file does).
jest.unmock('jsonwebtoken');

// Override the global next/server mock from jest.setup.js with one that
// supports BOTH the `new NextResponse(body, init)` constructor (used for
// 401/403 responses) and the `NextResponse.next(opts)` static method (used
// for pass-through with optional injected headers).
jest.mock('next/server', () => {
  class MockHeaders {
    private store: Record<string, string> = {};

    constructor(init?: unknown) {
      if (!init) return;
      if (Array.isArray(init)) {
        (init as Array<[string, string]>).forEach(([k, v]) => {
          this.store[k.toLowerCase()] = v;
        });
      } else if (typeof init === 'object' && init !== null) {
        const maybeForEach = (init as { forEach?: unknown }).forEach;
        if (typeof maybeForEach === 'function') {
          (init as { forEach: (cb: (v: string, k: string) => void) => void }).forEach(
            (v: string, k: string) => {
              this.store[k.toLowerCase()] = v;
            }
          );
        } else {
          Object.entries(init as Record<string, string>).forEach(([k, v]) => {
            this.store[k.toLowerCase()] = String(v);
          });
        }
      }
    }

    get(name: string): string | null {
      return this.store[name.toLowerCase()] ?? null;
    }

    set(name: string, value: string): void {
      this.store[name.toLowerCase()] = value;
    }

    delete(name: string): void {
      delete this.store[name.toLowerCase()];
    }

    has(name: string): boolean {
      return name.toLowerCase() in this.store;
    }

    forEach(cb: (value: string, key: string) => void): void {
      Object.entries(this.store).forEach(([k, v]) => cb(v, k));
    }
  }

  // NextResponse acts as both a constructor (for explicit responses) and a
  // namespace with a static `next()` method.
  const NextResponse = function (
    this: Record<string, unknown>,
    body?: string,
    init?: { status?: number; headers?: Record<string, string> }
  ) {
    this.status = init?.status ?? 200;
    this.headers = new MockHeaders(init?.headers);
    this.body = body;
    this.json = async () => (typeof body === 'string' ? JSON.parse(body) : body);
  } as unknown as {
    new (body?: string, init?: { status?: number; headers?: Record<string, string> }): unknown;
    next: jest.Mock;
  };

  NextResponse.next = jest.fn((opts?: { request?: { headers?: unknown } }) => {
    const result: Record<string, unknown> = {
      status: 200,
      headers: new MockHeaders(),
      _isNext: true,
    };
    if (opts?.request?.headers) {
      result._requestHeaders = opts.request.headers;
    }
    return result;
  }) as jest.Mock;

  return {
    NextResponse,
    NextRequest: jest.fn(),
  };
});

const JWT_SECRET = 'test-secret-for-proxy';

interface MockRequestOptions {
  pathname?: string;
  cookieToken?: string;
  authHeader?: string;
  forgedUserId?: string;
}

/**
 * Build a minimal NextRequest-shaped object that exposes only what
 * `proxy.ts` reads: `cookies.get('auth-token')`, `headers.get(...)`,
 * `nextUrl.pathname`, and an iterable headers `forEach` for the
 * `new Headers(request.headers)` copy.
 */
function createMockNextRequest(options: MockRequestOptions = {}) {
  const headerStore: Record<string, string> = {};
  if (options.authHeader) {
    headerStore['authorization'] = options.authHeader;
  }
  if (options.forgedUserId) {
    headerStore['x-user-id'] = options.forgedUserId;
    headerStore['x-user-role'] = 'admin';
    headerStore['x-user-name'] = 'forged-user';
    headerStore['x-user-authenticated'] = 'true';
  }

  const headers = {
    get: (name: string) => headerStore[name.toLowerCase()] ?? null,
    forEach: (cb: (value: string, key: string) => void) => {
      Object.entries(headerStore).forEach(([k, v]) => cb(v, k));
    },
    [Symbol.iterator]: function* () {
      for (const [k, v] of Object.entries(headerStore)) {
        yield [k, v];
      }
    },
  };

  return {
    cookies: {
      get: (name: string) => {
        if (name === 'auth-token' && options.cookieToken) {
          return { value: options.cookieToken };
        }
        return undefined;
      },
    },
    headers,
    nextUrl: { pathname: options.pathname ?? '/api/test' },
    url: `http://localhost:3000${options.pathname ?? '/api/test'}`,
  };
}

/**
 * Load the proxy module fresh, picking up whatever JWT_SECRET is in env
 * at this moment. proxy.ts captures process.env.JWT_SECRET at module
 * load (`const JWT_SECRET = process.env.JWT_SECRET;`), so module reset
 * is required to flip its visibility.
 */
function loadProxy(): (req: unknown) => unknown {
  let mod: { default: unknown };
  jest.isolateModules(() => {
    mod = require('../proxy');
  });
  // @ts-expect-error -- assigned in isolateModules callback
  return mod.default as (req: unknown) => unknown;
}

describe('proxy (root middleware on /api/:path*)', () => {
  const ORIGINAL_ENV = process.env.JWT_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = JWT_SECRET;
  });

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = ORIGINAL_ENV;
    }
  });

  // ------------------------------------------------------------------
  // 1. Non-API paths
  // ------------------------------------------------------------------
  describe('non-API paths', () => {
    test('passes through with NextResponse.next() and no headers injected', () => {
      const proxy = loadProxy();

      const request = createMockNextRequest({ pathname: '/dashboard' });
      const response = proxy(request) as Record<string, unknown>;

      // The non-API branch returns NextResponse.next() with no arguments
      // (no request override), so _requestHeaders should be absent.
      expect(response._isNext).toBe(true);
      expect(response._requestHeaders).toBeUndefined();
      expect(response.status).toBe(200);
    });

    test('does not inject identity headers for static paths', () => {
      const proxy = loadProxy();

      const r1 = proxy(createMockNextRequest({ pathname: '/' })) as Record<string, unknown>;
      const r2 = proxy(createMockNextRequest({ pathname: '/onboarding/step-1' })) as Record<
        string,
        unknown
      >;

      expect(r1._requestHeaders).toBeUndefined();
      expect(r2._requestHeaders).toBeUndefined();
    });
  });

  // ------------------------------------------------------------------
  // 2. Best-effort identity injection on every /api/*
  // ------------------------------------------------------------------
  describe('best-effort identity injection on /api/*', () => {
    test('injects x-user-* headers when a valid token is in cookie on a public-ish API path', () => {
      const proxy = loadProxy();
      const token = jwt.sign(
        { id: 'u-cookie', username: 'cookie-user', role: 'editor' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const request = createMockNextRequest({
        pathname: '/api/health',
        cookieToken: token,
      });
      const response = proxy(request) as {
        _requestHeaders?: { get: (k: string) => string | null };
      };

      expect(response._requestHeaders).toBeDefined();
      expect(response._requestHeaders!.get('x-user-id')).toBe('u-cookie');
      expect(response._requestHeaders!.get('x-user-name')).toBe('cookie-user');
      expect(response._requestHeaders!.get('x-user-role')).toBe('editor');
      expect(response._requestHeaders!.get('x-user-authenticated')).toBe('true');
    });

    test('strips caller-authored identity headers from a public ingestion route', () => {
      const proxy = loadProxy();
      const request = createMockNextRequest({
        pathname: '/api/analytics/events',
        forgedUserId: 'victim-user-id',
      });
      const response = proxy(request) as {
        _requestHeaders?: { get: (k: string) => string | null };
      };

      expect(response._requestHeaders).toBeDefined();
      expect(response._requestHeaders!.get('x-user-id')).toBeNull();
      expect(response._requestHeaders!.get('x-user-role')).toBeNull();
      expect(response._requestHeaders!.get('x-user-name')).toBeNull();
      expect(response._requestHeaders!.get('x-user-authenticated')).toBeNull();
    });

    test('injects x-user-* headers when a valid token is in Authorization: Bearer', () => {
      const proxy = loadProxy();
      const token = jwt.sign(
        { id: 'u-bearer', username: 'bearer-user', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const request = createMockNextRequest({
        pathname: '/api/health',
        authHeader: `Bearer ${token}`,
      });
      const response = proxy(request) as {
        _requestHeaders?: { get: (k: string) => string | null };
      };

      expect(response._requestHeaders).toBeDefined();
      expect(response._requestHeaders!.get('x-user-id')).toBe('u-bearer');
      expect(response._requestHeaders!.get('x-user-name')).toBe('bearer-user');
      expect(response._requestHeaders!.get('x-user-role')).toBe('admin');
    });

    test('cookie token wins over Authorization header when both present', () => {
      const proxy = loadProxy();

      const cookieToken = jwt.sign(
        { id: 'cookie-id', username: 'cookie-name', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      const headerToken = jwt.sign(
        { id: 'header-id', username: 'header-name', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const request = createMockNextRequest({
        pathname: '/api/health',
        cookieToken,
        authHeader: `Bearer ${headerToken}`,
      });
      const response = proxy(request) as {
        _requestHeaders?: { get: (k: string) => string | null };
      };

      expect(response._requestHeaders!.get('x-user-id')).toBe('cookie-id');
      expect(response._requestHeaders!.get('x-user-name')).toBe('cookie-name');
    });
  });

  // ------------------------------------------------------------------
  // 3. Public-ish API paths: no token / invalid token => pass through
  // ------------------------------------------------------------------
  describe('non-protected /api/* paths tolerate missing/invalid tokens', () => {
    test('no token, no error: passes through with sanitized headers', () => {
      const proxy = loadProxy();
      const request = createMockNextRequest({ pathname: '/api/health' });
      const response = proxy(request) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(response._requestHeaders).toBeDefined();
    });

    test('invalid token: passes through silently (no error response)', () => {
      const proxy = loadProxy();
      const request = createMockNextRequest({
        pathname: '/api/health',
        cookieToken: 'definitely-not-a-jwt',
      });
      const response = proxy(request) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(response._requestHeaders).toBeDefined();
    });

    test('expired token: passes through silently', () => {
      const proxy = loadProxy();
      const expired = jwt.sign({ id: 'expired-user', username: 'ex', role: 'admin' }, JWT_SECRET, {
        expiresIn: '-1s',
      });
      const request = createMockNextRequest({
        pathname: '/api/health',
        cookieToken: expired,
      });
      const response = proxy(request) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(response._requestHeaders).toBeDefined();
    });

    test('JWT_SECRET missing: still passes through on public-ish API path', () => {
      delete process.env.JWT_SECRET;
      const proxy = loadProxy();
      const request = createMockNextRequest({
        pathname: '/api/health',
        cookieToken: 'whatever',
      });
      const response = proxy(request) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(response._requestHeaders).toBeDefined();
    });

    test('allows the exact X OAuth callback to validate its sealed flow cookie', () => {
      const proxy = loadProxy();
      const request = createMockNextRequest({
        pathname: '/api/platforms/x/callback',
      });
      const response = proxy(request) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(response._requestHeaders).toBeDefined();
    });

    test('allows the exact scheduler processor to validate its cron secret', () => {
      const proxy = loadProxy();
      const request = createMockNextRequest({
        pathname: '/api/scheduler/process',
      });
      const response = proxy(request) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(response._requestHeaders).toBeDefined();
    });

    test('does not exempt scheduler processor subpaths from JWT authentication', async () => {
      const proxy = loadProxy();
      const request = createMockNextRequest({
        pathname: '/api/scheduler/process/admin',
      });
      const response = proxy(request) as {
        status: number;
        json: () => Promise<{ message: string }>;
      };

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ message: 'Authentication required' });
    });
  });

  // ------------------------------------------------------------------
  // 4. authenticatedPaths
  // ------------------------------------------------------------------
  describe('authenticatedPaths', () => {
    const protectedPaths = [
      '/api/platforms',
      '/api/queue',
      '/api/images',
      '/api/parse',
      '/api/summarize',
      '/api/content',
      '/api/campaigns',
      '/api/feedback',
      '/api/notifications',
      '/api/scheduler',
    ];

    test.each(protectedPaths)(
      '%s: missing token returns 401 "Authentication required"',
      async pathname => {
        const proxy = loadProxy();
        const request = createMockNextRequest({ pathname });
        const response = proxy(request) as {
          status: number;
          json: () => Promise<{ message: string }>;
        };

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.message).toBe('Authentication required');
      }
    );

    test('missing JWT_SECRET on protected path returns 401 "Authentication service unavailable..."', async () => {
      delete process.env.JWT_SECRET;
      const proxy = loadProxy();
      const request = createMockNextRequest({ pathname: '/api/platforms' });
      const response = proxy(request) as {
        status: number;
        json: () => Promise<{ message: string }>;
      };

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.message).toMatch(/Authentication service unavailable/);
    });

    test('invalid token on protected path returns 401 "Invalid or expired authentication token"', async () => {
      const proxy = loadProxy();
      const request = createMockNextRequest({
        pathname: '/api/queue',
        cookieToken: 'garbage-token',
      });
      const response = proxy(request) as {
        status: number;
        json: () => Promise<{ message: string }>;
      };

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.message).toBe('Invalid or expired authentication token');
    });

    test('expired token on protected path returns 401 "Invalid or expired..."', async () => {
      const proxy = loadProxy();
      const expired = jwt.sign({ id: 'u', username: 'u', role: 'admin' }, JWT_SECRET, {
        expiresIn: '-1s',
      });
      const request = createMockNextRequest({
        pathname: '/api/content',
        cookieToken: expired,
      });
      const response = proxy(request) as {
        status: number;
        json: () => Promise<{ message: string }>;
      };

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.message).toBe('Invalid or expired authentication token');
    });

    test('valid (non-admin) token on protected path passes through with identity headers', () => {
      const proxy = loadProxy();
      const token = jwt.sign({ id: '7', username: 'editor7', role: 'editor' }, JWT_SECRET, {
        expiresIn: '1h',
      });
      const request = createMockNextRequest({
        pathname: '/api/platforms',
        cookieToken: token,
      });
      const response = proxy(request) as {
        _requestHeaders?: { get: (k: string) => string | null };
        status: number;
      };

      expect(response.status).toBe(200);
      expect(response._requestHeaders).toBeDefined();
      expect(response._requestHeaders!.get('x-user-id')).toBe('7');
      expect(response._requestHeaders!.get('x-user-name')).toBe('editor7');
      expect(response._requestHeaders!.get('x-user-role')).toBe('editor');
    });

    test('valid token on subpath of authenticated path also passes (startsWith match)', () => {
      const proxy = loadProxy();
      const token = jwt.sign({ id: 'u', username: 'u', role: 'editor' }, JWT_SECRET, {
        expiresIn: '1h',
      });
      const request = createMockNextRequest({
        pathname: '/api/queue/123/items',
        cookieToken: token,
      });
      const response = proxy(request) as {
        _requestHeaders?: { get: (k: string) => string | null };
        status: number;
      };

      expect(response.status).toBe(200);
      expect(response._requestHeaders!.get('x-user-id')).toBe('u');
    });

    test('Bearer token (no cookie) on protected path also passes', () => {
      const proxy = loadProxy();
      const token = jwt.sign({ id: 'b', username: 'b', role: 'editor' }, JWT_SECRET, {
        expiresIn: '1h',
      });
      const request = createMockNextRequest({
        pathname: '/api/notifications',
        authHeader: `Bearer ${token}`,
      });
      const response = proxy(request) as {
        _requestHeaders?: { get: (k: string) => string | null };
        status: number;
      };

      expect(response.status).toBe(200);
      expect(response._requestHeaders!.get('x-user-id')).toBe('b');
      expect(response._requestHeaders!.get('x-user-role')).toBe('editor');
    });
  });

  // ------------------------------------------------------------------
  // 5. adminPaths
  // ------------------------------------------------------------------
  describe('adminPaths', () => {
    const adminPaths = ['/api/feature-flags', '/api/audit'];

    test.each(adminPaths)(
      '%s: missing token returns 401 "Authentication required"',
      async pathname => {
        const proxy = loadProxy();
        const request = createMockNextRequest({ pathname });
        const response = proxy(request) as {
          status: number;
          json: () => Promise<{ message: string }>;
        };

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.message).toBe('Authentication required');
      }
    );

    test.each(adminPaths)(
      '%s: non-admin valid token returns 403 "Admin privileges required"',
      async pathname => {
        const proxy = loadProxy();
        const token = jwt.sign(
          { id: 'editor-id', username: 'editor', role: 'editor' },
          JWT_SECRET,
          { expiresIn: '1h' }
        );
        const request = createMockNextRequest({ pathname, cookieToken: token });
        const response = proxy(request) as {
          status: number;
          json: () => Promise<{ message: string }>;
        };

        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.message).toBe('Admin privileges required');
      }
    );

    test.each(adminPaths)(
      '%s: admin valid token passes through with identity headers',
      pathname => {
        const proxy = loadProxy();
        const token = jwt.sign(
          { id: 'admin-id', username: 'rootadmin', role: 'admin' },
          JWT_SECRET,
          { expiresIn: '1h' }
        );
        const request = createMockNextRequest({ pathname, cookieToken: token });
        const response = proxy(request) as {
          _requestHeaders?: { get: (k: string) => string | null };
          status: number;
        };

        expect(response.status).toBe(200);
        expect(response._requestHeaders).toBeDefined();
        expect(response._requestHeaders!.get('x-user-id')).toBe('admin-id');
        expect(response._requestHeaders!.get('x-user-role')).toBe('admin');
        expect(response._requestHeaders!.get('x-user-name')).toBe('rootadmin');
      }
    );

    test('admin path without JWT_SECRET returns 401 service unavailable (admin check never reached)', async () => {
      delete process.env.JWT_SECRET;
      const proxy = loadProxy();
      const request = createMockNextRequest({ pathname: '/api/feature-flags' });
      const response = proxy(request) as {
        status: number;
        json: () => Promise<{ message: string }>;
      };

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.message).toMatch(/Authentication service unavailable/);
    });

    test('admin path with invalid token returns 401, not 403', async () => {
      const proxy = loadProxy();
      const request = createMockNextRequest({
        pathname: '/api/audit',
        cookieToken: 'not-a-jwt',
      });
      const response = proxy(request) as {
        status: number;
        json: () => Promise<{ message: string }>;
      };

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.message).toBe('Invalid or expired authentication token');
    });
  });

  // ------------------------------------------------------------------
  // 6. config
  // ------------------------------------------------------------------
  describe('config', () => {
    test('matcher is set to /api/:path*', () => {
      let cfg: { matcher: string };
      jest.isolateModules(() => {
        cfg = require('../proxy').config;
      });
      // @ts-expect-error -- assigned inside isolateModules
      expect(cfg.matcher).toBe('/api/:path*');
    });
  });
});
