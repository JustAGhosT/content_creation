import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// Define paths that require authentication
const authenticatedPaths = [
  '/api/platforms',
  '/api/queue',
  '/api/images',
  '/api/parse',
  '/api/summarize',
  '/api/content',
  '/api/feedback',
  '/api/notifications',
];

// Define paths that require admin authentication
const adminPaths = [
  '/api/feature-flags',
  '/api/audit',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for non-API routes
  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Check if the path requires authentication
  const requiresAuth = authenticatedPaths.some(path => pathname.startsWith(path));
  const requiresAdmin = adminPaths.some(path => pathname.startsWith(path));

  if (requiresAuth || requiresAdmin) {
    // Get the authentication token from cookies first
    let token = request.cookies.get('auth-token')?.value;
    
    // If no cookie, try the authorization header
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    // If no token is present, return 401 Unauthorized
    if (!token) {
      return new NextResponse(
        JSON.stringify({ message: 'Authentication required' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    try {
      // Get JWT secret
      const secretKey = process.env.JWT_SECRET;
      if (!secretKey) {
        throw new Error('JWT_SECRET environment variable is not set');
      }

      // Verify the token
      const decoded = jwt.verify(token, secretKey) as jwt.JwtPayload;
      
      // Check if token has expired
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        return new NextResponse(
          JSON.stringify({ message: 'Token has expired' }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // For admin paths, perform additional admin verification
      if (requiresAdmin) {
        const isAdmin = decoded.role === 'admin';
        
        if (!isAdmin) {
          return new NextResponse(
            JSON.stringify({ message: 'Admin privileges required' }),
            { 
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      }

      // Add user info to request headers for use in API routes
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', decoded.id as string);
      requestHeaders.set('x-user-role', decoded.role as string);
      requestHeaders.set('x-user-name', decoded.username as string);

      // Continue with the modified request
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      console.error('Token verification error:', error);
      
      return new NextResponse(
        JSON.stringify({ message: 'Invalid authentication token' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  // For non-protected routes, continue normally
  return NextResponse.next();
}

// Configure the middleware to run only on API routes
export const config = {
  matcher: '/api/:path*',
};