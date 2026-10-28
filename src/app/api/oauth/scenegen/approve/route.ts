import { NextRequest, NextResponse } from "next/server";
import { getBackendHeaders, getBackendUrl } from "@/lib/backend";

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = await request.json();
  const response = await fetch(`${getBackendUrl()}/internal/oauth/approve`, {
    method: "POST",
    headers: getBackendHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ ...input, userId }),
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({ error: "OAuth service unavailable" }));
  return NextResponse.json(body, { status: response.status });
}
