import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Verifies if the request is authenticated
 * @returns Boolean indicating if the request is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  return !!userId;
}

/**
 * Verifies if the request is from an admin user
 * @returns Boolean indicating if the request is from an admin
 */
export async function isAdmin(): Promise<boolean> {
  const headersList = await headers();
  const userRole = headersList.get('x-user-role');
  return userRole === 'admin';
}

/**
 * Gets the current user ID from the request
 * @returns User ID or null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get('x-user-id');
}

/**
 * Gets the current username from the request
 * @returns Username or null if not authenticated
 */
export async function getCurrentUsername(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get('x-user-name');
}

/**
 * Gets the current user role from the request
 * @returns User role or null if not authenticated
 */
export async function getCurrentUserRole(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get('x-user-role');
}

/**
 * Middleware-style function to require authentication
 * @param handler The route handler function to protect
 * @returns A function that checks auth before calling the handler
 */
export function withAuth<T extends Response | object>(handler: () => Promise<T>): () => Promise<T | NextResponse> {
  return async () => {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }
    return handler();
  };
}

/**
 * Middleware-style function to require admin authentication
 * @param handler The route handler function to protect
 * @returns A function that checks admin auth before calling the handler
 */
export function withAdminAuth<T>(handler: () => Promise<T>): () => Promise<T | NextResponse> {
  return async () => {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (!(await isAdmin())) {
      return NextResponse.json(
        { message: 'Admin privileges required' },
        { status: 403 }
      );
    }
    
    return handler();
  };
}