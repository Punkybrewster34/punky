import crypto from 'crypto';
import { cookies } from 'next/headers';

export const COOKIE_NAME = 'punky_admin_session';
export const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms

function secret(): string {
  return process.env.SESSION_SECRET ?? 'fallback-secret-change-before-deploying';
}

function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? 'admin123';
}

export function verifyAdminPassword(password: string): boolean {
  return password === adminPassword();
}

export function createSessionToken(): string {
  const expires = Date.now() + SESSION_DURATION;
  const payload = String(expires);
  const sig = crypto
    .createHmac('sha256', secret())
    .update(`${payload}:${adminPassword()}`)
    .digest('hex');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): boolean {
  const dot = token.indexOf('.');
  if (dot === -1) return false;
  const expires = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (Date.now() > parseInt(expires, 10)) return false;
  const expectedSig = crypto
    .createHmac('sha256', secret())
    .update(`${expires}:${adminPassword()}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'));
  } catch {
    return false;
  }
}

export function isAdminAuthenticated(): boolean {
  try {
    const jar = cookies();
    const c = jar.get(COOKIE_NAME);
    return c ? verifySessionToken(c.value) : false;
  } catch {
    return false;
  }
}
