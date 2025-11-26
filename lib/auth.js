import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import crypto from 'crypto';
import { sql } from '@vercel/postgres';

const ACCESS_TOKEN_NAME = 'luxeestate_access';
const REFRESH_TOKEN_NAME = 'luxeestate_refresh';
const ACCESS_TOKEN_TTL = '1h';
const REFRESH_TOKEN_DAYS = 7;

const JWT_SECRET = process.env.JWT_SECRET || 'insecure_dev_secret';

export class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

export function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

export function serializeAuthCookies(accessToken, refreshToken) {
  const accessCookie = cookie.serialize(ACCESS_TOKEN_NAME, accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60, // 1 hour
  });

  const refreshCookie = cookie.serialize(REFRESH_TOKEN_NAME, refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * REFRESH_TOKEN_DAYS,
  });

  return [accessCookie, refreshCookie];
}

export function clearAuthCookies() {
  const accessCookie = cookie.serialize(ACCESS_TOKEN_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  const refreshCookie = cookie.serialize(REFRESH_TOKEN_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  return [accessCookie, refreshCookie];
}

export async function storeRefreshToken(userId, token) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  await sql`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()})
  `;
}

export async function revokeRefreshToken(token) {
  if (!token) return;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await sql`DELETE FROM refresh_tokens WHERE token_hash = ${tokenHash}`;
}

export async function revokeAllRefreshTokensForUser(userId) {
  await sql`DELETE FROM refresh_tokens WHERE user_id = ${userId}`;
}

export async function verifyRefreshToken(token) {
  if (!token) return null;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const result = await sql`
    SELECT rt.*, u.id as user_id, u.email, u.role, u.name
    FROM refresh_tokens rt
    JOIN users u ON u.id = rt.user_id
    WHERE rt.token_hash = ${tokenHash} AND rt.expires_at > NOW()
    LIMIT 1
  `;
  return result.rows[0] || null;
}

export async function issueAuthCookies(res, user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  await storeRefreshToken(user.id, refreshToken);
  res.setHeader('Set-Cookie', serializeAuthCookies(accessToken, refreshToken));
  return { accessToken, refreshToken };
}

export function getTokenFromRequest(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  return cookies[ACCESS_TOKEN_NAME] || null;
}

export async function authenticateRequest(req, allowedRoles = []) {
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies[ACCESS_TOKEN_NAME];

    if (!token) {
      throw new AuthError('Not authenticated', 401);
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
      throw new AuthError('Forbidden', 403);
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthError('Invalid token', 401);
    }
    throw error;
  }
}

export async function getUserByEmail(email) {
  const result = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
  return result.rows[0] || null;
}

export async function getUserById(id) {
  const result = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
  return result.rows[0] || null;
}

