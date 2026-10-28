import { NextRequest, NextResponse } from 'next/server';
import { collaboratorAuth } from '@/collaborator-auth';
import { setInitialPassword } from '@/lib/auth-db';
import { validPassword } from '@/lib/auth-validation';

export async function POST(request: NextRequest) {
  const session = await collaboratorAuth();
  const userId = session?.user?.id;
  const body = await request.json().catch(() => ({}));
  if (!userId) return NextResponse.json({ error: { message: 'Your invitation session has expired' } }, { status: 401 });
  if (!validPassword(body.password)) return NextResponse.json({ error: { message: 'Use a password between 12 and 128 characters.' } }, { status: 422 });
  const result = await setInitialPassword(userId, body.password);
  if (!result.created) return NextResponse.json({ error: { message: 'This account already has a password. Sign in or use password reset to change it.' } }, { status: 409 });
  return NextResponse.json({ success: true });
}
