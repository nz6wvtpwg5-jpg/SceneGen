import { NextRequest, NextResponse } from "next/server";
import { registrationStatus } from "@/lib/auth-db";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("scenegen_registration_status")?.value || "";
  const result = token ? await registrationStatus(token) : { status: "unavailable" as const };
  const response = NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  if (result.status === "verified" || result.status === "unavailable") {
    response.cookies.set("scenegen_registration_status", "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  }
  return response;
}
