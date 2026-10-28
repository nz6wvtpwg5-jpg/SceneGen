import { NextRequest, NextResponse } from "next/server";
import { checkAuthRateLimit, findUserByEmail, issueToken } from "@/lib/auth-db";
import { sendAuthEmail } from "@/lib/auth-email";
import { publicAppUrl } from "@/lib/public-app-url";
import { validEmail } from "@/lib/auth-validation";
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = body.email;
  if (validEmail(email)) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const normalized = email.trim().toLowerCase();
    const [emailAllowed, ipAllowed] = await Promise.all([
      checkAuthRateLimit('forgot-password-email', normalized, 5, 3600),
      checkAuthRateLimit('forgot-password-ip', ip, 20, 3600),
    ]);
    if (!emailAllowed || !ipAllowed) return NextResponse.json({ message: "If an account exists, a reset email is on its way." }, { status: 202 });
    const user = await findUserByEmail(email);
    // Google-created accounts have no password hash, but their email address was
    // verified by Google. Let them establish a SceneGen password through the
    // same email-bound, short-lived reset flow without creating another user.
    if (user?.emailVerifiedAt) {
      const token = await issueToken(user.id, "reset_password", 120);
      const baseUrl = publicAppUrl(request.nextUrl.origin);
      try { await sendAuthEmail({ to: user.email, subject: "Reset your SceneGen password", action: "Reset your password",
        actionUrl: `${baseUrl}/reset-password?token=${encodeURIComponent(token)}${body.audience === 'collaborator' ? '&audience=collaborator' : ''}` }); }
      catch (error) { console.error('Password reset email delivery failed:', error instanceof Error ? error.message : 'Unknown error'); }
    }
  }
  return NextResponse.json({ message: "If an account exists, a reset email is on its way." }, { status: 202 });
}
