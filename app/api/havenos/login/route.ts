import { NextRequest, NextResponse } from 'next/server';
import {
  verifyHavenosPassword,
  createHavenosToken,
  HAVENOS_COOKIE,
  HAVENOS_SESSION_DURATION,
} from '@/lib/havenos-auth';

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password: string };

  if (!verifyHavenosPassword(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = createHavenosToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(HAVENOS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: HAVENOS_SESSION_DURATION / 1000,
    path: '/',
  });
  return res;
}
