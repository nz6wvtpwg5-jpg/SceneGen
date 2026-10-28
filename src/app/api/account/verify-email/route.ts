import { NextRequest, NextResponse } from "next/server";
import { consumeToken, verifyEmail } from "@/lib/auth-db";
export async function POST(request: NextRequest) {
  const token = String((await request.json().catch(() => ({}))).token ?? "");
  const userId = token ? await consumeToken(token, "verify_email") : undefined;
  if (!userId) return NextResponse.json({ error: "This verification link is invalid or expired." }, { status: 400 });
  await verifyEmail(userId);
  return NextResponse.json({ message: "Email verified. You can now sign in." });
}
