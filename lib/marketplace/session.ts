import crypto from 'crypto';
import { cookies } from 'next/headers';
import { User } from './types';
import { getUserById } from './db';

export const USER_COOKIE = 'punky_user_session';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

function secret(): string {
  return process.env.SESSION_SECRET ?? 'fallback-secret-change-before-deploying';
}

// Token format: <userId>.<expiresMs>.<hmac>
export function createUserToken(userId: string): string {
  const expires = Date.now() + SESSION_DURATION;
  const payload = `${userId}.${expires}`;
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyUserToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, expires, sig] = parts;
  if (Date.now() > parseInt(expires, 10)) return null;
  const expected = crypto
    .createHmac('sha256', secret())
    .update(`${userId}.${expires}`)
    .digest('hex');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
      return null;
    }
  } catch {
    return null;
  }
  return userId;
}

export function setSessionCookie(userId: string): void {
  cookies().set(USER_COOKIE, createUserToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DURATION / 1000,
  });
}

export function clearSessionCookie(): void {
  cookies().delete(USER_COOKIE);
}

// Server-side current-user lookup. Returns the full user record (minus
// nothing — callers should strip passwordHash before sending to client).
export function getCurrentUser(): User | null {
  try {
    const c = cookies().get(USER_COOKIE);
    if (!c) return null;
    const userId = verifyUserToken(c.value);
    if (!userId) return null;
    return getUserById(userId);
  } catch {
    return null;
  }
}

export function publicUser(u: User) {
  const { passwordHash, ...rest } = u;
  return rest;
}
