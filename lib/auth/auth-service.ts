import jwt, { JwtPayload } from 'jsonwebtoken';
import { cookies, headers } from 'next/headers';
import { enforceMapSize } from '../utils/bounded-store';

// User interfaces
export interface User {
  id: string;
  username: string;
  role: string;
  isAdmin?: boolean;
}

export interface TokenPayload extends JwtPayload {
  id: string;
  username: string;
  role: string;
}

// MEM-01 Fix: In-memory token blacklist with bounded size
// In production, replace with Redis or another database for horizontal scaling
const tokenBlacklist = new Map<string, number>();

// MEM-01 Fix: Maximum number of blacklisted tokens to prevent memory exhaustion
const MAX_BLACKLIST_SIZE = 10000;

/**
 * Authentication service for handling JWT operations and user authentication
 */
export class AuthService {
  /**
   * Get JWT secret from environment variables
   * @returns JWT secret
   * @throws Error if JWT_SECRET is not set
   */
  private getJwtSecret(): string {
    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    return secretKey;
  }

  /**
   * Generate a JWT token for a user
   * @param user User object
   * @param expiresIn Token expiration time (default: 1h)
   * @returns JWT token
   */
  public generateToken(user: User, expiresIn = '1h'): string {
    const secret = this.getJwtSecret();
    if (!secret) {
      throw new Error('JWT secret is not configured');
    }
    // JWT library accepts expiresIn as a string (e.g., '1h', '7d') or number (seconds)
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
      },
      secret,
      { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] }
    );
    return token;
  }

  /**
   * Verify a JWT token
   * @param token JWT token
   * @returns Decoded token payload or null if invalid
   */
  public verifyToken(token: string): TokenPayload | null {
    try {
      // Check if token is blacklisted
      if (this.isTokenBlacklisted(token)) {
        return null;
      }

      const decoded = jwt.verify(token, this.getJwtSecret()) as TokenPayload;

      // BUG-08 Fix: Add null check before accessing decoded properties
      if (!decoded || typeof decoded !== 'object') {
        return null;
      }

      // Check if token has expired
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        return null;
      }

      // BUG-08 Fix: Validate required fields exist before returning
      if (!decoded.id || !decoded.username || !decoded.role) {
        return null;
      }

      return decoded;
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  /**
   * Get user from request (using cookies or authorization header)
   * BUG-03 Fix: Made async to properly handle Next.js 14+ async cookies() and headers()
   * @returns User object or null if not authenticated
   */
  public async getCurrentUser(): Promise<User | null> {
    try {
      // BUG-03 Fix: Properly await cookies() and headers() which return Promises in Next.js 14+
      const cookieStore = await cookies();
      const tokenFromCookie = cookieStore.get('auth-token')?.value;

      // If no cookie, try to get from authorization header
      const headersList = await headers();
      const authHeader = headersList.get('authorization');
      const tokenFromHeader = authHeader ? authHeader.replace('Bearer ', '') : null;

      // Use whichever token is available
      const token = tokenFromCookie || tokenFromHeader;

      if (!token) {
        return null;
      }

      const decoded = this.verifyToken(token);
      if (!decoded) {
        return null;
      }

      return {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
        isAdmin: decoded.role === 'admin',
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Check if a token is blacklisted
   * @param token JWT token
   * @returns Boolean indicating if token is blacklisted
   */
  public isTokenBlacklisted(token: string): boolean {
    return tokenBlacklist.has(token);
  }

  /**
   * Add a token to the blacklist
   * MEM-01 Fix: Now enforces maximum size to prevent memory exhaustion
   * @param token JWT token
   * @param expiryTime Time in seconds until token expiration
   */
  public addToTokenBlacklist(token: string, expiryTime: number): void {
    // MEM-01 Fix: Clean up before adding to prevent unbounded growth
    this.cleanupBlacklist();

    // MEM-01 Fix: If still at max size after cleanup, evict oldest entries
    // Uses shared utility to avoid code duplication
    enforceMapSize(tokenBlacklist, MAX_BLACKLIST_SIZE, 0.1);

    tokenBlacklist.set(token, Date.now() + expiryTime * 1000);
  }

  /**
   * Clean up expired tokens from blacklist
   */
  private cleanupBlacklist(): void {
    const now = Date.now();
    for (const [token, expiry] of tokenBlacklist.entries()) {
      if (expiry < now) {
        tokenBlacklist.delete(token);
      }
    }
  }

  /**
   * Find a user by username
   * Uses Prisma if available, falls back to hardcoded admin user
   * @param username Username to search for
   * @returns User object or null if not found
   */
  public async findUserByUsername(username: string): Promise<User | null> {
    // Try to use Prisma if available
    try {
      const { prisma } = await import('../db/prisma');
      if (prisma) {
        // Dynamic access: Prisma client is typed at runtime after generation
        const db = prisma as unknown as Record<string, unknown>;
        const userModel = db.user as
          | {
              findUnique: (args: {
                where: { username: string };
              }) => Promise<{ id: string; username: string; role: string } | null>;
            }
          | undefined;
        if (userModel?.findUnique) {
          const dbUser = await userModel.findUnique({
            where: { username },
          });
          if (dbUser) {
            return {
              id: dbUser.id,
              username: dbUser.username,
              role: dbUser.role,
              isAdmin: dbUser.role === 'admin',
            };
          }
        }
      }
    } catch {
      // Prisma not available, fall through to hardcoded user
    }

    // Hardcoded admin user for local development and tests only
    if (process.env.NODE_ENV !== 'production' && username === 'admin') {
      return {
        id: 'admin-1',
        username: 'admin',
        role: 'admin',
        isAdmin: true,
      };
    }

    // Fallback to environment-based test user (for development/testing)
    const testUsername = process.env.TEST_USER_USERNAME;
    const testRole = process.env.TEST_USER_ROLE || 'admin';

    if (testUsername && username === testUsername) {
      return {
        id: '1',
        username: testUsername,
        role: testRole,
        isAdmin: testRole === 'admin',
      };
    }

    return null;
  }

  /**
   * Verify user credentials
   * Uses Prisma with bcrypt if available, falls back to environment-based verification
   * SECURITY: In production, only bcrypt comparison is allowed for database users
   * @param username Username
   * @param password Password
   * @returns Boolean indicating if credentials are valid
   */
  public async verifyUserCredentials(username: string, password: string): Promise<boolean> {
    const isProduction = process.env.NODE_ENV === 'production';

    // Try to use Prisma if available
    try {
      const { prisma } = await import('../db/prisma');
      if (prisma) {
        const db = prisma as unknown as Record<string, unknown>;
        const userModel = db.user as
          | {
              findUnique: (args: { where: { username: string } }) => Promise<{
                id: string;
                username: string;
                role: string;
                passwordHash: string;
              } | null>;
            }
          | undefined;
        if (userModel?.findUnique) {
          const dbUser = await userModel.findUnique({
            where: { username },
          });
          if (dbUser?.passwordHash) {
            // Use bcryptjs to compare passwords securely
            try {
              const bcrypt = await import('bcryptjs');
              return await bcrypt.compare(password, dbUser.passwordHash);
            } catch (bcryptError) {
              console.error('[Auth] Failed to load or use bcryptjs:', bcryptError);
              // In production, never allow plaintext fallback
              if (isProduction) {
                console.error('[Auth] bcryptjs unavailable in production - denying access');
                return false;
              }
              // In development only, warn and deny (no plaintext fallback)
              console.warn(
                '[Auth] bcryptjs unavailable - install bcryptjs for password verification'
              );
              return false;
            }
          }
        }
      }
    } catch {
      // Prisma not available, fall through to test credentials
    }

    // Hardcoded admin/admin credentials for local development and tests only
    if (!isProduction && username === 'admin' && password === 'admin') {
      return true;
    }

    // Fallback to environment-based test credentials (for development/testing ONLY)
    // This fallback is disabled in production for security
    if (isProduction) {
      console.warn('[Auth] Test credentials fallback disabled in production');
      return false;
    }

    const testUsername = process.env.TEST_USER_USERNAME;
    const testPassword = process.env.TEST_USER_PASSWORD;

    if (!testUsername || !testPassword) {
      // No test credentials configured, but hardcoded admin/admin is available
      return false;
    }

    return username === testUsername && password === testPassword;
  }
}

// Export singleton instance
export const authService = new AuthService();
