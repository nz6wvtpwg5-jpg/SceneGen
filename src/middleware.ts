import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth(async (req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Conversations are intentionally held back from the MVP. Keep the route
  // and its data intact so the feature can be restored without a migration.
  if (pathname === "/conversations") {
    return NextResponse.redirect(new URL("/contacts", req.url));
  }

  // Public routes that don't require authentication
  const publicRoutes = [
    "/app",
    "/login",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/resend-verification",
    "/api/auth",
    "/api/collaborator-auth",
    "/api/collaborator/",
    "/api/collaborator-access/",
    "/api/account",
    "/api/health",
    "/invite", // Allow invite acceptance without login
    "/shared/show",
    "/day-sheet-invite",
    "/external-day-sheets",
    "/collaborator-access",
    "/terms",
    "/privacy",
    "/offline",
    "/unavailable",
  ];
  const publicMetadataRoutes = new Set([
    "/icon.svg",
    "/manifest.webmanifest",
    "/opengraph-image",
    "/robots.txt",
    "/sitemap.xml",
    "/sw.js",
  ]);

  // Check if the current path is public
  const isPublicTokenLookup = (req.method === "GET" && (
    /^\/api\/shared\/show\/[^/]+$/.test(pathname) ||
    /^\/api\/invites\/[^/]+$/.test(pathname) ||
    /^\/api\/day-sheet-invitations\/[^/]+$/.test(pathname)
  )) || (req.method === "POST" && /^\/api\/day-sheet-invitations\/[^/]+\/accept$/.test(pathname));
  const isPublicRoute = pathname === "/" || publicRoutes.some((route) => pathname.startsWith(route)) || publicMetadataRoutes.has(pathname) || isPublicTokenLookup;

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // For API routes (other than public routes), return 401 instead of redirecting
  // and replace any caller-supplied identity with the signed session identity.
  if (pathname.startsWith("/api/")) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const serviceToken = process.env.BACKEND_SERVICE_TOKEN;
    if (!serviceToken || !req.auth?.user?.id) {
      return NextResponse.json({ error: "Authentication service is not configured" }, { status: 503 });
    }
    const headers = new Headers(req.headers);
    const encodedUserId = btoa(req.auth.user.id).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(serviceToken), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signatureBytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedUserId)));
    const signature = btoa(String.fromCharCode(...signatureBytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    headers.set("authorization", `Bearer ${encodedUserId}.${signature}`);
    headers.set("x-user-id", req.auth.user.id);
    if (req.auth.user.email) headers.set("x-user-email", req.auth.user.email);
    if (req.auth.user.name) headers.set("x-user-name", req.auth.user.name);
    return NextResponse.next({ request: { headers } });
  }

  // Redirect to login if not authenticated (for page routes)
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  // Allow authenticated users to proceed
  return NextResponse.next();
});

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
