import { NextRequest, NextResponse } from 'next/server';
import { checkAuthRateLimit, findUserByEmail, issueToken } from '@/lib/auth-db';
import { sendAuthEmail } from '@/lib/auth-email';
import { publicAppUrl } from '@/lib/public-app-url';
import { validEmail } from '@/lib/auth-validation';

const generic = { message: 'If an unverified account exists, a new verification email is on its way.' };
export async function POST(request: NextRequest) {
  const email = (await request.json().catch(() => ({}))).email;
  if (!validEmail(email)) return NextResponse.json(generic, { status: 202 });
  const normalized = email.trim().toLowerCase(); const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const [emailAllowed, ipAllowed] = await Promise.all([
    checkAuthRateLimit('resend-verification-email', normalized, 3, 3600),
    checkAuthRateLimit('resend-verification-ip', ip, 20, 3600),
  ]);
  if (!emailAllowed || !ipAllowed) return NextResponse.json(generic, { status: 202 });
  const user = await findUserByEmail(normalized);
  if (user && !user.emailVerifiedAt) {
    const token = await issueToken(user.id, 'verify_email', 1440); const baseUrl = publicAppUrl(request.nextUrl.origin);
    try { await sendAuthEmail({ to: user.email, subject: 'Verify your SceneGen email', action: 'Verify your SceneGen email', actionUrl: `${baseUrl}/verify-email?token=${encodeURIComponent(token)}` }); }
    catch (error) { console.error('Verification email delivery failed:', error instanceof Error ? error.message : 'Unknown error'); }
  }
  return NextResponse.json(generic, { status: 202 });
}
