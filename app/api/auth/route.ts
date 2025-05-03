import { hn as createAuditLog, LR as recordAuditEvent } from '@/lib/audit';
import { I as ApiErrors } from '@/lib/errors';
import { oI as validateString } from '@/lib/validation';
import * as jose from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Mock user data - in a real app, this would come from a database
const users = [
  { id: "1", username: "admin", password: "admin123", role: "admin" },
  { id: "2", username: "user", password: "user123", role: "user" }
];

// Helper functions
async function findUser(username: string) {
  return users.find(user => user.username === username);
}

async function validateCredentials(username: string, password: string) {
  const user = users.find(user => user.username === username);
  return user ? user.password === password : false;
}

async function validateInput(username: string, password: string) {
  const usernameError = validateString(username, "Username");
  if (usernameError) return ApiErrors.badRequest(usernameError);
  const passwordError = validateString(password, "Password");
  if (passwordError) return ApiErrors.badRequest(passwordError);
  return null;
}

async function authenticateUser(username: string, password: string) {
  await recordAuditEvent(await createAuditLog("LOGIN_ATTEMPT", { username }));
  
  const user = await findUser(username);
  if (!user) {
    await recordAuditEvent(await createAuditLog("LOGIN_FAILED", { username, reason: "User not found" }));
    return ApiErrors.unauthorized("Invalid username or password");
  }
    
  const isValid = await validateCredentials(username, password);
  if (!isValid) {
    await recordAuditEvent(await createAuditLog("LOGIN_FAILED", { username, reason: "Invalid password" }));
    return ApiErrors.unauthorized("Invalid username or password");
  }
    
  return user;
}

async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: 'auth-token',
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 3600,
    path: '/'
  });
}
    
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return secret;
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const validationError = await validateInput(username, password);
    if (validationError) return validationError;
    const user = await authenticateUser(username, password);
    if (user instanceof NextResponse) return user;
    
    // Generate JWT token using jose instead of jsonwebtoken
    const token = await new jose.SignJWT({ 
      id: user.id,
      role: user.role,
      username: user.username,
      iat: Math.floor(Date.now() / 1000)
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(getJwtSecret()));
    
    await setAuthCookie(token);
    
    await recordAuditEvent(await createAuditLog("LOGIN_SUCCESS", { username, userId: user.id }));
    
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return ApiErrors.internalServerError("An error occurred during login");
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'auth-token',
      value: '',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });
    
    await recordAuditEvent(await createAuditLog("LOGOUT"));
    return NextResponse.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return ApiErrors.internalServerError("An error occurred during logout");
  }
}
