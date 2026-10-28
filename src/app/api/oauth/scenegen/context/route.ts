import { NextRequest, NextResponse } from "next/server";
import { getBackendHeaders, getBackendUrl } from "@/lib/backend";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parameters = Object.fromEntries(request.nextUrl.searchParams);
  const response = await fetch(`${getBackendUrl()}/internal/oauth/context`, {
    method: "POST",
    headers: getBackendHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ ...parameters, userId }),
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({ error: "OAuth service unavailable" }));
  return NextResponse.json(body, { status: response.status });
}
