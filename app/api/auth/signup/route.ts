import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/marketplace/db';
import { setSessionCookie, publicUser } from '@/lib/marketplace/session';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const { email, password, name, role, phone } = body as Record<string, string>;

  if (!email || !password || !name || !role) {
    return NextResponse.json({ error: 'Email, name, password and role are required' }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  if (role !== 'customer' && role !== 'provider') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }
  if (getUserByEmail(email)) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
  }

  const user = createUser({ email, password, name, role, phone });
  setSessionCookie(user.id);
  return NextResponse.json({ user: publicUser(user) }, { status: 201 });
}
