import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { withErrorHandling, Errors } from '../_utils/errors';
import { createLogEntry, logToAuditTrail } from '../_utils/audit';
import { validateString } from '../_utils/validation';
import jwt from 'jsonwebtoken';

// Import Request type from Next.js
import type { NextRequest } from 'next/server';

// Import feature flags
import featureFlags from '../../../utils/featureFlags';

// Helper function to get JWT secret
function getJwtSecret(): string {
  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secretKey;
}

// Helper function to find user by username
// This is a placeholder - replace with actual database lookup
async function findUserByUsername(username: string): Promise<any> {
  // This would be replaced with actual database lookup
  const users = [
    { id: '1', username: 'admin', password: 'hashed_password', role: 'admin' },
    { id: '2', username: 'user', password: 'hashed_password', role: 'user' }
  ];
  
  return users.find(user => user.username === username);
}

// Helper function to verify user credentials
// This is a placeholder - replace with actual password verification
async function verifyUserCredentials(username: string, password: string): Promise<boolean> {
  // In a real implementation, you would:
  // 1. Find the user by username
  // 2. Hash the provided password with the same algorithm used for storage
  // 3. Compare the hashed password with the stored hash
  
  // For now, we'll just do a simple check against our mock users
  const users = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'user', password: 'user123', role: 'user' }
  ];
  
  const user = users.find(u => u.username === username);
  return user ? user.password === password : false;
}

// Login endpoint
export const POST = withErrorHandling(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { username, password } = body;
    
    // Validate input
    const usernameError = validateString(username, 'Username');
    if (usernameError) {
      return Errors.badRequest(usernameError);
    }
    
    const passwordError = validateString(password, 'Password');
    if (passwordError) {
      return Errors.badRequest(passwordError);
    }
    
    // Log the login attempt (without the password)
    await logToAuditTrail(createLogEntry('LOGIN_ATTEMPT', { username }));
    
    // Find user
    const user = await findUserByUsername(username);
    if (!user) {
      await logToAuditTrail(createLogEntry('LOGIN_FAILED', { username, reason: 'User not found' }));
      return Errors.unauthorized('Invalid username or password');
    }
    
    // Verify credentials
    const isPasswordValid = await verifyUserCredentials(username, password);
    if (!isPasswordValid) {
      await logToAuditTrail(createLogEntry('LOGIN_FAILED', { username, reason: 'Invalid password' }));
      return Errors.unauthorized('Invalid username or password');
    }
    
    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        username: user.username,
        iat: Math.floor(Date.now() / 1000)
      },
      getJwtSecret(),
      { expiresIn: '1h' }
    );
    
    // Set HTTP-only cookie with the token
    cookies().set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
      path: '/'
    });
    
    // Log successful login
    await logToAuditTrail(createLogEntry('LOGIN_SUCCESS', { username, userId: user.id }));
    
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
});

// Logout endpoint
export const DELETE = withErrorHandling(async () => {
  // Clear the auth cookie
  cookies().set({
    name: 'auth-token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/'
  });
  
  // Log the logout
  await logToAuditTrail(createLogEntry('LOGOUT'));
  
  return NextResponse.json({ message: 'Logged out successfully' });
});
