import { NextRequest, NextResponse } from "next/server";
import { checkAuthRateLimit, createPasswordUser, issueToken } from "@/lib/auth-db";
import { sendAuthEmail } from "@/lib/auth-email";
import { publicAppUrl } from "@/lib/public-app-url";
import { validEmail, validPassword } from "@/lib/auth-validation";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || !validEmail(body.email) || !validPassword(body.password) || typeof body.name !== "string" || body.name.trim().length < 2) {
    return NextResponse.json({ error: "Enter a name, a valid email, and a password of at least 12 characters." }, { status: 400 });
  }
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const email = body.email.trim().toLowerCase();
  const [emailAllowed, ipAllowed] = await Promise.all([
    checkAuthRateLimit('register-email', email, 5, 3600),
    checkAuthRateLimit('register-ip', ip, 20, 3600),
  ]);
  if (!emailAllowed || !ipAllowed) {
    return NextResponse.json({ message: "If that address can be registered, a verification email is on its way." }, { status: 202 });
  }
  const userId = await createPasswordUser({ email: body.email, name: body.name, password: body.password });
  if (userId) {
    const token = await issueToken(userId, "verify_email", 60 * 24);
    const baseUrl = publicAppUrl(request.nextUrl.origin);
    try { await sendAuthEmail({ to: email, subject: "Verify your SceneGen email",
      action: "Verify your SceneGen email", actionUrl: `${baseUrl}/verify-email?token=${encodeURIComponent(token)}` }); }
    catch (error) { console.error('Verification email delivery failed:', error instanceof Error ? error.message : 'Unknown error'); }
  }
  const response = NextResponse.json({ message: "If that address can be registered, a verification email is on its way." }, { status: 202 });
  if (userId) {
    try {
      const statusToken = await issueToken(userId, "registration_status", 60 * 24);
      response.cookies.set("scenegen_registration_status", statusToken, {
        httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production",
        path: "/", maxAge: 60 * 60 * 24,
      });
    } catch {
      console.error("Registration status handoff could not be created");
    }
  }
  return response;
}
