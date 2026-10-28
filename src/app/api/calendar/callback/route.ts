import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { verifyCalendarState } from '@/lib/calendar-oauth-state';
import { storeCalendarTokens } from '@/lib/calendar-connection';
const redirect = (request: NextRequest, value: string) => {
	// Render terminates TLS at its proxy, so request.url can contain the internal
	// localhost:10000 address. Always prefer the configured public application
	// origin when returning the browser from Google's OAuth callback.
	let publicOrigin = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
	if (!publicOrigin && process.env.GOOGLE_REDIRECT_URI) {
		try {
			publicOrigin = new URL(process.env.GOOGLE_REDIRECT_URI).origin;
		} catch {
			// The callback will fall back to the incoming origin below.
		}
	}
	const response = NextResponse.redirect(new URL(value, publicOrigin || request.nextUrl.origin));
	response.cookies.set('calendar_oauth_nonce', '', {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 0,
		path: '/api/calendar/callback',
	});
	return response;
};
export async function GET(request: NextRequest) { const session = await auth(); const code = request.nextUrl.searchParams.get('code'); const state = request.nextUrl.searchParams.get('state'); const nonce = request.cookies.get('calendar_oauth_nonce')?.value; if (!session?.user?.id || !code || !state || !nonce || !verifyCalendarState(state, session.user.id, nonce)) return redirect(request, '/shows?error=calendar_auth_failed'); try { const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID || '', client_secret: process.env.GOOGLE_CLIENT_SECRET || '', redirect_uri: process.env.GOOGLE_REDIRECT_URI || '', grant_type: 'authorization_code' }) }); if (!response.ok) return redirect(request, '/shows?error=calendar_auth_error'); const tokens = await response.json(); if (!tokens.access_token) return redirect(request, '/shows?error=calendar_auth_error'); await storeCalendarTokens(session.user.id, { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt: new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000).toISOString(), scope: tokens.scope }); return redirect(request, '/shows?calendar_connected=true'); } catch (error) { console.error('Google Calendar callback failed:', error instanceof Error ? error.message : 'Unknown error'); return redirect(request, '/shows?error=calendar_auth_error'); } }
