import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { calendarConnectionFailure, getCalendarTokens } from '@/lib/calendar-connection';
import { getBackendUrl } from '@/lib/backend';
import { GoogleCalendarService, showToCalendarEvent } from '@/services/google-calendar';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try { new Intl.DateTimeFormat('en-GB', { timeZone: value }).format(); return true; } catch { return false; }
}

function backendHeaders(request: NextRequest) {
  const authorization = request.headers.get('authorization')?.trim();
  const entityId = request.headers.get('x-entity-id')?.trim();
  if (!authorization || !entityId || !UUID.test(entityId)) return null;
  return { 'Content-Type': 'application/json', Authorization: authorization, 'X-Entity-Id': entityId };
}

async function backendJson(url: string, headers: Record<string, string>, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { ...headers, ...(init?.headers || {}) }, cache: 'no-store' });
  if (!response.ok) throw new Error(`SceneGen request failed (${response.status})`);
  return response.json();
}

async function resolveShowTimeZone(show: any, fallback: unknown) {
  const latitude = Number(show.latitude ?? show.venue?.latitude);
  const longitude = Number(show.longitude ?? show.venue?.longitude);
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (apiKey && Number.isFinite(latitude) && Number.isFinite(longitude)) {
    try {
      const timestamp = Math.floor(new Date(`${String(show.showDate).slice(0, 10)}T12:00:00Z`).getTime() / 1000);
      const params = new URLSearchParams({ location: `${latitude},${longitude}`, timestamp: String(timestamp), key: apiKey });
      const response = await fetch(`https://maps.googleapis.com/maps/api/timezone/json?${params}`, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'OK' && validTimeZone(data.timeZoneId)) return data.timeZoneId;
      }
    } catch (error) {
      console.warn('Venue timezone lookup failed; using account fallback', error);
    }
  }
  return validTimeZone(fallback) ? fallback : 'UTC';
}

async function context(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  const connection = await getCalendarTokens(session.user.id);
  if (!connection?.accessToken) return { error: NextResponse.json({ error: 'Google Calendar not connected. Please connect your calendar first.' }, { status: 401 }) };
  const headers = backendHeaders(request);
  if (!headers) return { error: NextResponse.json({ error: 'Valid workspace context is required' }, { status: 400 }) };
  return { headers, calendar: new GoogleCalendarService(connection.accessToken, connection.refreshToken || undefined) };
}

export async function POST(request: NextRequest) {
  let createdEventId: string | null = null;
  let calendar: GoogleCalendarService | null = null;
  try {
    const ctx = await context(request);
    if ('error' in ctx) return ctx.error;
    calendar = ctx.calendar;
    const { showId } = await request.json();
    if (!UUID.test(String(showId || ''))) return NextResponse.json({ error: 'Valid show ID is required' }, { status: 400 });
    const backend = getBackendUrl();
    const [showPayload, user] = await Promise.all([
      backendJson(`${backend}/api/shows/${encodeURIComponent(showId)}`, ctx.headers),
      backendJson(`${backend}/api/user/get`, ctx.headers),
    ]);
    const show = showPayload.show;
    if (!show) throw new Error('Show response is invalid');
    if (show.googleCalendarEventId) return NextResponse.json({ success: true, eventId: show.googleCalendarEventId, message: 'Show is already synced' });
    const timeZone = await resolveShowTimeZone(show, user.timezone);
    createdEventId = await calendar.createEvent(showToCalendarEvent(show, timeZone));
    await backendJson(`${backend}/api/shows/${encodeURIComponent(showId)}`, ctx.headers, {
      method: 'PATCH', body: JSON.stringify({ googleCalendarEventId: createdEventId }),
    });
    return NextResponse.json({ success: true, eventId: createdEventId, message: 'Show synced to Google Calendar' });
  } catch (error) {
    if (createdEventId && calendar) {
      try { await calendar.deleteEvent(createdEventId); } catch (cleanupError) { console.error('Calendar rollback failed', cleanupError); }
    }
    const calendarFailure = calendarConnectionFailure(error);
    if (calendarFailure) return NextResponse.json(calendarFailure.body, { status: calendarFailure.status });
    console.error('Error syncing to calendar:', error);
    return NextResponse.json({ error: 'Failed to sync show to Google Calendar' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await context(request);
    if ('error' in ctx) return ctx.error;
    const { showId } = await request.json();
    if (!UUID.test(String(showId || ''))) return NextResponse.json({ error: 'Valid show ID is required' }, { status: 400 });
    const backend = getBackendUrl();
    const showPayload = await backendJson(`${backend}/api/shows/${encodeURIComponent(showId)}`, ctx.headers);
    const show = showPayload.show;
    if (!show) throw new Error('Show response is invalid');
    const eventId = show.googleCalendarEventId;
    if (!eventId) return NextResponse.json({ success: true, message: 'Show is not synced' });
    await backendJson(`${backend}/api/shows/${encodeURIComponent(showId)}`, ctx.headers, {
      method: 'PATCH', body: JSON.stringify({ googleCalendarEventId: null }),
    });
    try {
      await ctx.calendar.deleteEvent(eventId);
    } catch (error) {
      // Restore SceneGen's sync marker if the provider deletion did not happen.
      // This keeps the operation retryable instead of presenting a false
      // unsynced state while the Google event still exists.
      try {
        await backendJson(`${backend}/api/shows/${encodeURIComponent(showId)}`, ctx.headers, {
          method: 'PATCH', body: JSON.stringify({ googleCalendarEventId: eventId }),
        });
      } catch {
        console.error('Calendar unsync rollback failed');
      }
      throw error;
    }
    return NextResponse.json({ success: true, message: 'Show removed from Google Calendar' });
  } catch (error) {
    const calendarFailure = calendarConnectionFailure(error);
    if (calendarFailure) return NextResponse.json(calendarFailure.body, { status: calendarFailure.status });
    console.error('Error deleting calendar event:', error);
    return NextResponse.json({ error: 'Failed to remove show from Google Calendar' }, { status: 500 });
  }
}
