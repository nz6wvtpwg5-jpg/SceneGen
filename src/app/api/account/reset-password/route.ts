import { NextRequest, NextResponse } from "next/server";
import { checkAuthRateLimit, resetPasswordWithToken } from "@/lib/auth-db";
import { validPassword } from "@/lib/auth-validation";
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (!validPassword(body.password) || typeof body.token !== "string") {
    return NextResponse.json({ error: "Use a password of at least 12 characters." }, { status: 400 });
  }
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!(await checkAuthRateLimit('reset-password', ip, 10, 3600))) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const result = await resetPasswordWithToken(body.token, body.password);
  if (!result.updated) return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });
  return NextResponse.json({ message: "Password updated. You can now sign in." });
}
