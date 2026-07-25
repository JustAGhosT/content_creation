import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createLogEntry, logToAuditTrail } from '../_utils/audit';
import { Errors, withErrorHandling } from '../_utils/errors';
import { validateString } from '../_utils/validation';
import { authService, User } from '../../../lib/auth/auth-service';
import { withRateLimit, RateLimitPresets } from '../_utils/rateLimit';
import { prisma } from '../../../lib/db/prisma';

/**
 * Validates login input parameters
 * @param username Username to validate
 * @param password Password to validate
 * @returns Error response or null if valid
 */
async function validateLoginInput(
  username: string,
  password: string
): Promise<NextResponse | null> {
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
async function authenticateUser(username: string, password: string): Promise<User | NextResponse> {
  // Log the login attempt (without the password)
  await logToAuditTrail(await createLogEntry('LOGIN_ATTEMPT', { username }));

  // Find user
  const user = await authService.findUserByUsername(username);
  if (!user) {
    await logToAuditTrail(
      await createLogEntry('LOGIN_FAILED', { username, reason: 'User not found' })
    );
    return Errors.unauthorized('Invalid username or password');
  }

  // Verify credentials
  const isPasswordValid = await authService.verifyUserCredentials(username, password);
  if (!isPasswordValid) {
    await logToAuditTrail(
      await createLogEntry('LOGIN_FAILED', { username, reason: 'Invalid password' })
    );
    return Errors.unauthorized('Invalid username or password');
  }

  return user;
}

/**
 * Generates a JWT token for a user
 * @param user User object
 * @returns JWT token
 */
function generateToken(user: User): string {
  return authService.generateToken(user);
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
    path: '/',
  });
}

/**
 * Handles user registration with Prisma/PostgreSQL persistence
 * @param request Request object
 * @returns Response with JWT token and user info
 */
async function handleRegister(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    // Validate required fields
    const usernameError = validateString(username, 'Username');
    if (usernameError) {
      return Errors.badRequest(usernameError);
    }

    const emailError = validateString(email, 'Email');
    if (emailError) {
      return Errors.badRequest(emailError);
    }

    const passwordError = validateString(password, 'Password');
    if (passwordError) {
      return Errors.badRequest(passwordError);
    }

    // Validate password length
    if (typeof password === 'string' && password.length < 8) {
      return Errors.badRequest('Password must be at least 8 characters');
    }

    if (!prisma) {
      return Errors.internalServerError('Database is not available');
    }

    // Dynamic access: Prisma client models are typed at runtime after generation
    const db = prisma as unknown as Record<string, unknown>;
    const userModel = db.user as {
      findUnique: (args: {
        where: { username?: string; email?: string };
      }) => Promise<{ id: string; username: string; email: string; role: string } | null>;
      create: (args: {
        data: { username: string; email: string; passwordHash: string; role: string };
      }) => Promise<{ id: string; username: string; email: string; role: string }>;
    };

    // Check if username already exists
    const existingByUsername = await userModel.findUnique({
      where: { username },
    });
    if (existingByUsername) {
      return Errors.badRequest('Username already exists');
    }

    // Check if email already exists
    const existingByEmail = await userModel.findUnique({
      where: { email },
    });
    if (existingByEmail) {
      return Errors.badRequest('Email already exists');
    }

    // Hash password
    let passwordHash: string;
    try {
      const bcrypt = await import('bcryptjs');
      passwordHash = await bcrypt.hash(password, 10);
    } catch {
      if (process.env.NODE_ENV === 'production') {
        return Errors.internalServerError('Password hashing unavailable');
      }
      // Dev-only fallback: prefix to mark as unhashed (never accept in prod)
      console.warn('[Auth] bcryptjs not available — using dev-only unhashed password');
      passwordHash = `__dev_unhashed__${password}`;
    }

    // Create user in database
    const dbUser = await userModel.create({
      data: {
        username,
        email,
        passwordHash,
        role: 'user',
      },
    });

    const newUser: User = {
      id: dbUser.id,
      username: dbUser.username,
      role: dbUser.role,
    };

    // Log registration
    await logToAuditTrail(
      await createLogEntry('REGISTER_SUCCESS', { username, userId: newUser.id })
    );

    // Generate JWT token
    const token = generateToken(newUser);

    // Set HTTP-only cookie with the token
    await setAuthCookie(token);

    return NextResponse.json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return Errors.internalServerError('An error occurred during registration');
  }
}

// Login endpoint - handle login request
async function handleLogin(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, username, password, email } = body;

    // Route to registration if action is 'register'
    if (action === 'register') {
      // Re-create the request with the body for handleRegister
      const registerBody = JSON.stringify({ username, email, password });
      const registerRequest = new Request(request.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: registerBody,
      });
      return handleRegister(registerRequest);
    }

    // Validate input
    const validationError = await validateLoginInput(username, password);
    if (validationError) {
      return validationError;
    }

    // Authenticate user via Prisma and auth service
    const userOrError = await authenticateUser(username, password);
    // Check if authentication returned an error response (NextResponse)
    if (userOrError && typeof userOrError === 'object' && 'status' in userOrError) {
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
        role: user.role,
      },
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
      path: '/',
    });

    // Log the logout
    await logToAuditTrail(await createLogEntry('LOGOUT'));

    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return Errors.internalServerError('An error occurred during logout');
  }
}

// Export route handlers with proper error handling and rate limiting
// Auth endpoint uses strict rate limiting to prevent brute force attacks
export const POST = withRateLimit(
  withErrorHandling(async (req: Request) => handleLogin(req)),
  '/api/auth',
  RateLimitPresets.AUTH
);

export const DELETE = withErrorHandling(async (_req: Request) => handleLogout());
