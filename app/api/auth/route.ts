import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createLogEntry, logToAuditTrail } from '../_utils/audit';
import { Errors, withErrorHandling } from '../_utils/errors';
import { validateString } from '../_utils/validation';

// Import Request type from Next.js
import type { NextRequest } from 'next/server';

// Helper function to get JWT secret
function getJwtSecret(): string {
  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secretKey;
}
// Define users in one place to avoid duplication
const MOCK_USERS = [
  { id: '1', username: 'admin', password: 'admin123', role: 'admin' },
  { id: '2', username: 'user', password: 'user123', role: 'user' }
];

// Helper function to find user by username
// This is a placeholder - replace with actual database lookup
async function findUserByUsername(username: string): Promise<any> {
  // This would be replaced with actual database lookup
  return MOCK_USERS.find(user => user.username === username);
}

// Helper function to verify user credentials
// This is a placeholder - replace with actual password verification
async function verifyUserCredentials(username: string, password: string): Promise<boolean> {
  // In a real implementation, you would:
  // 1. Find the user by username
  // 2. Hash the provided password with the same algorithm used for storage
  // 3. Compare the hashed password with the stored hash
  
  // For now, we'll just do a simple check against our mock users
  const user = MOCK_USERS.find(u => u.username === username);
  return user ? user.password === password : false;
}

/**
 * Validates login input parameters
 * @param username Username to validate
 * @param password Password to validate
 * @returns Error response or null if valid
 */
async function validateLoginInput(username: string, password: string): Promise<NextResponse | null> {
  // Validate username
  const usernameError = validateString(username, 'Username');
  if (usernameError) {
    return Errors.badRequest(usernameError);
  }
    
  // Validate password
  const passwordError = validateString(password, 'Password');
  if (passwordError) {
    return Errors.badRequest(passwordError);
  }
    
  return null;
}

/**
 * Authenticates a user
 * @param username Username to authenticate
 * @param password Password to verify
 * @returns User object or error response
 */
async function authenticateUser(username: string, password: string): Promise<any | NextResponse> {
  // Log the login attempt (without the password)
  await logToAuditTrail(await createLogEntry('LOGIN_ATTEMPT', { username }));
    
  // Find user
  const user = await findUserByUsername(username);
  if (!user) {
    await logToAuditTrail(await createLogEntry('LOGIN_FAILED', { username, reason: 'User not found' }));
    return Errors.unauthorized('Invalid username or password');
  }
    
  // Verify credentials
  const isPasswordValid = await verifyUserCredentials(username, password);
  if (!isPasswordValid) {
    await logToAuditTrail(await createLogEntry('LOGIN_FAILED', { username, reason: 'Invalid password' }));
    return Errors.unauthorized('Invalid username or password');
  }
    
  return user;
}

/**
 * Generates a JWT token for a user
 * @param user User object
 * @returns JWT token
 */
function generateToken(user: any): string {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      username: user.username,
      iat: Math.floor(Date.now() / 1000)
    },
    getJwtSecret(),
    { expiresIn: '1h' }
  );
}
    
/**
 * Sets the authentication cookie
 * @param token JWT token
 */
async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: 'auth-token',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60, // 1 hour
    path: '/'
  });
}
    
// Login endpoint - handle login request
async function handleLogin(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { username, password } = body;
    
    // Validate input
    const validationError = await validateLoginInput(username, password);
    if (validationError) {
      return validationError;
    }
    
    // Authenticate user
    const userOrError = await authenticateUser(username, password);
    if (userOrError instanceof NextResponse) {
      return userOrError; // Return error response if authentication failed
    }
    
    const user = userOrError;
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Set HTTP-only cookie with the token
    await setAuthCookie(token);
    // Log successful login
    await logToAuditTrail(await createLogEntry('LOGIN_SUCCESS', { username, userId: user.id }));
    
    // Return token and basic user info (omitting sensitive data)
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return Errors.internalServerError('An error occurred during login');
  }
}

// Logout endpoint - handle logout request
async function handleLogout(): Promise<NextResponse> {
  try {
    // Clear the auth cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'auth-token',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });
  
    // Log the logout
    await logToAuditTrail(await createLogEntry('LOGOUT'));
  
    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return Errors.internalServerError('An error occurred during logout');
  }
}

// Export route handlers with proper error handling
export const POST = withErrorHandling(async (req: Request) => handleLogin(req));
export const DELETE = withErrorHandling(async (req: Request) => handleLogout());
