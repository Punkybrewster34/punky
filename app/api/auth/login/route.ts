import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/marketplace/db';
import { verifyPassword } from '@/lib/marketplace/passwords';
import { setSessionCookie, publicUser } from '@/lib/marketplace/session';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const { email, password } = body as Record<string, string>;
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const user = getUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 });
  }

  setSessionCookie(user.id);
  return NextResponse.json({ user: publicUser(user) });
}
