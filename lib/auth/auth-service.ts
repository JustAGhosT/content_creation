import jwt, { JwtPayload } from 'jsonwebtoken';
import { cookies } from 'next/headers';

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

// In-memory token blacklist (replace with Redis or another database in production)
const tokenBlacklist = new Map<string, number>();

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
  public generateToken(user: User, expiresIn: string = '1h'): string {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        iat: Math.floor(Date.now() / 1000)
      },
      this.getJwtSecret(),
      { expiresIn }
    );
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
      
      // Check if token has expired
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
   * Get user from request (using cookies or authorization header)
   * @returns User object or null if not authenticated
   */
  public getCurrentUser(): User | null {
    try {
      // Try to get token from cookies first
      const cookieStore = cookies();
      const tokenFromCookie = cookieStore.get('auth-token')?.value;
      
      // If no cookie, try to get from authorization header
      const headersList = headers();
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
        isAdmin: decoded.role === 'admin'
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
   * @param token JWT token
   * @param expiryTime Time in seconds until token expiration
   */
  public addToTokenBlacklist(token: string, expiryTime: number): void {
    tokenBlacklist.set(token, Date.now() + expiryTime * 1000);
    
    // Clean up expired tokens from blacklist
    this.cleanupBlacklist();
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
   * @param username Username to search for
   * @returns User object or null if not found
   */
  public async findUserByUsername(username: string): Promise<User | null> {
    // This would be replaced with actual database lookup
    const users = [
      { id: '1', username: 'admin', password: 'hashed_password', role: 'admin' },
      { id: '2', username: 'user', password: 'hashed_password', role: 'user' }
    ];
    
    const user = users.find(user => user.username === username);
    return user ? user : null;
  }

  /**
   * Verify user credentials
   * @param username Username
   * @param password Password
   * @returns Boolean indicating if credentials are valid
   */
  public async verifyUserCredentials(username: string, password: string): Promise<boolean> {
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
}

// Export singleton instance
export const authService = new AuthService();

// Helper function to get headers (Next.js)
import { headers } from 'next/headers';