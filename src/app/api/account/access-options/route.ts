import { NextRequest, NextResponse } from 'next/server';
import { resolvePasswordAccess } from '@/lib/auth-db';
import { validEmail } from '@/lib/auth-validation';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!validEmail(email) || password.length < 1 || password.length > 128) {
    return NextResponse.json({ valid: false, member: false, collaborator: false });
  }
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip') || 'unknown';
  try {
    return NextResponse.json(await resolvePasswordAccess(email, password, ip));
  } catch {
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable.' }, { status: 503 });
  }
}
