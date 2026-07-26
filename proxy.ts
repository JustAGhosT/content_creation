import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// JWT_SECRET is optional at startup to allow health checks and deployment verification
// Authentication will fail gracefully if JWT_SECRET is missing when needed
const JWT_SECRET = process.env.JWT_SECRET;

// Define paths that require authentication
const authenticatedPaths = [
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

// Provider callbacks cannot carry the browser's Authorization header. These
// exact routes enforce their own sealed, expiring OAuth state boundary.
const authenticationExemptPaths = ['/api/platforms/x/callback'];

// Define paths that require admin authentication
const adminPaths = ['/api/feature-flags', '/api/audit'];

/**
 * Extract token from request
 */
function getToken(request: NextRequest): string | null {
  // Try cookie first
  const cookieToken = request.cookies.get('auth-token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  // Try authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Create unauthorized response
 */
function createUnauthorizedResponse(message: string): NextResponse {
  return new NextResponse(JSON.stringify({ message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Create forbidden response
 */
function createForbiddenResponse(message: string): NextResponse {
  return new NextResponse(JSON.stringify({ message }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Verify and decode JWT token
 */
function verifyToken(token: string): jwt.JwtPayload | null {
  // If JWT_SECRET is not configured, authentication cannot be performed
  if (!JWT_SECRET) {
    console.warn('JWT_SECRET not configured - authentication unavailable');
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Check if path requires authentication
 */
function requiresAuthentication(pathname: string): { auth: boolean; admin: boolean } {
  if (authenticationExemptPaths.includes(pathname)) {
    return { auth: false, admin: false };
  }
  const requiresAdmin = adminPaths.some(path => pathname.startsWith(path));
  const requiresAuth = authenticatedPaths.some(path => pathname.startsWith(path)) || requiresAdmin;

  return { auth: requiresAuth, admin: requiresAdmin };
}

/**
 * Inject identity headers from a verified JWT payload so downstream route
 * handlers (isAuthenticated, getCurrentUserId, ...) can read them.
 */
function nextWithIdentityHeaders(request: NextRequest, decoded: jwt.JwtPayload): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', decoded.id as string);
  requestHeaders.set('x-user-role', decoded.role as string);
  requestHeaders.set('x-user-name', decoded.username as string);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip proxy for non-API routes
  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const { auth: requiresAuth, admin: requiresAdmin } = requiresAuthentication(pathname);

  // Best-effort token extraction for every /api/* request: even routes that don't
  // require auth may consult x-user-id (e.g. forms accept optional identity).
  // This matches the prior middleware.ts contract.
  const token = getToken(request);
  const decoded = token && JWT_SECRET ? verifyToken(token) : null;

  if (requiresAuth) {
    if (!JWT_SECRET) {
      console.warn(
        `JWT_SECRET not configured - authentication required for ${pathname} but unavailable`
      );
      return createUnauthorizedResponse(
        'Authentication service unavailable - JWT_SECRET not configured'
      );
    }
    if (!token) {
      return createUnauthorizedResponse('Authentication required');
    }
    if (!decoded) {
      return createUnauthorizedResponse('Invalid or expired authentication token');
    }
    if (requiresAdmin && decoded.role !== 'admin') {
      return createForbiddenResponse('Admin privileges required');
    }
  }

  return decoded ? nextWithIdentityHeaders(request, decoded) : NextResponse.next();
}

// Configure the proxy to run only on API routes
export const config = {
  matcher: '/api/:path*',
};
