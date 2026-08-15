import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createSessionToken, ADMIN_SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/admin-session';

export async function POST(request: Request) {
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!passwordHash) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD_HASH is not configured' }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const password = body?.password;
  if (typeof password !== 'string' || password.length === 0) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }

  const matches = await bcrypt.compare(password, passwordHash);
  if (!matches) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
