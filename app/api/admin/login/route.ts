import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword, createSessionToken, COOKIE_NAME, SESSION_DURATION } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password: string };

  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });
  return res;
}
