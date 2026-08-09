import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { User } from '../../../lib/auth/auth-service';

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
 * Gets an identity only when the API proxy marked it as JWT-verified.
 * Public routes must use this instead of trusting caller-authored identity headers.
 */
export async function getVerifiedCurrentUserId(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get('x-user-authenticated') === 'true' ? headersList.get('x-user-id') : null;
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
 * Gets the current user object from the request headers
 * @returns User object or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const username = headersList.get('x-user-name');
  const role = headersList.get('x-user-role');

  if (!userId || !username || !role) {
    return null;
  }

  return {
    id: userId,
    username: username,
    role: role,
  };
}

/**
 * Middleware-style function to require authentication
 * @param handler The route handler function to protect
 * @returns A function that checks auth before calling the handler
 */
export function withAuth<T extends Response | object>(
  handler: () => Promise<T>
): () => Promise<T | NextResponse> {
  return async () => {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
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
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    if (!(await isAdmin())) {
      return NextResponse.json({ message: 'Admin privileges required' }, { status: 403 });
    }

    return handler();
  };
}
