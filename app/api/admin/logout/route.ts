import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, getAdminCookieOptions } from '@/lib/admin-auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    ...getAdminCookieOptions(0),
    maxAge: 0,
  });
  return response;
}
