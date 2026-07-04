import crypto from 'crypto';
import { cookies } from 'next/headers';

export const HAVENOS_COOKIE = 'havenos_session';
export const HAVENOS_SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

function secret(): string {
  return process.env.SESSION_SECRET ?? 'fallback-secret-change-before-deploying';
}

function havenosPassword(): string {
  // Override by setting HAVENOS_PASSWORD in Vercel → Settings → Environment Variables
  return process.env.HAVENOS_PASSWORD ?? 'Haven60K-2027';
}

export function verifyHavenosPassword(password: string): boolean {
  return password === havenosPassword();
}

export function createHavenosToken(): string {
  const expires = Date.now() + HAVENOS_SESSION_DURATION;
  const payload = String(expires);
  const sig = crypto
    .createHmac('sha256', secret())
    .update(`havenos:${payload}:${havenosPassword()}`)
    .digest('hex');
  return `${payload}.${sig}`;
}

export function verifyHavenosToken(token: string): boolean {
  const dot = token.indexOf('.');
  if (dot === -1) return false;
  const expires = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (Date.now() > parseInt(expires, 10)) return false;
  const expectedSig = crypto
    .createHmac('sha256', secret())
    .update(`havenos:${expires}:${havenosPassword()}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'));
  } catch {
    return false;
  }
}

export function isHavenosAuthenticated(): boolean {
  try {
    const jar = cookies();
    const c = jar.get(HAVENOS_COOKIE);
    return c ? verifyHavenosToken(c.value) : false;
  } catch {
    return false;
  }
}
