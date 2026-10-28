import { getBackendHeaders, getBackendUrl } from '@/lib/backend';

export type CalendarTokens = { accessToken: string; refreshToken?: string | null; expiresAt?: string | null; scope?: string | null };

export class CalendarConnectionError extends Error {
  readonly reason: 'reconnect_required' | 'temporarily_unavailable';
  constructor(reason: 'reconnect_required' | 'temporarily_unavailable') {
    super(reason === 'reconnect_required' ? 'Google Calendar needs to be reconnected.' : 'Google Calendar is temporarily unavailable. Please try again.');
    this.name = 'CalendarConnectionError';
    this.reason = reason;
  }
}

/** Return actionable Calendar API errors without exposing Google's credential responses. */
export function calendarConnectionFailure(error: unknown) {
  if (!(error instanceof CalendarConnectionError)) return null;
  if (error.reason === 'reconnect_required') return { status: 401 as const, body: { error: error.message, reconnectRequired: true } };
  return { status: 503 as const, body: { error: error.message, temporarilyUnavailable: true } };
}

const REFRESH_EARLY_MS = 2 * 60 * 1000;
const inFlightRefreshes = new Map<string, Promise<CalendarTokens>>();

async function call<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${getBackendUrl()}/internal/calendar/${path}`, {
    method: 'POST', headers: getBackendHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body), cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Calendar connection service returned ${response.status}`);
  return response.json() as Promise<T>;
}

export async function storeCalendarTokens(userId: string, tokens: CalendarTokens) {
  // Backend encryption and UPSERT preserve an existing refresh token when
  // Google only supplies a new access token.
  await call('store', { userId, ...tokens });
}

async function getStoredCalendarTokens(userId: string) {
  return (await call<{ connection: CalendarTokens | null }>('get', { userId })).connection;
}

async function renewCalendarTokens(userId: string, previous: CalendarTokens): Promise<CalendarTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!previous.refreshToken) throw new CalendarConnectionError('reconnect_required');
  if (!clientId || !clientSecret) throw new CalendarConnectionError('temporarily_unavailable');
  let response: Response;
  try {
    response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId, client_secret: clientSecret,
        refresh_token: previous.refreshToken, grant_type: 'refresh_token',
      }),
      cache: 'no-store',
    });
  } catch {
    throw new CalendarConnectionError('temporarily_unavailable');
  }
  if (!response.ok) {
    // invalid_grant means offline consent has expired or been revoked.
    const failure = await response.json().catch(() => null) as { error?: string } | null;
    if (failure?.error === 'invalid_grant') throw new CalendarConnectionError('reconnect_required');
    throw new CalendarConnectionError('temporarily_unavailable');
  }
  const tokens = await response.json().catch(() => null) as {
    access_token?: string; refresh_token?: string; expires_in?: number; scope?: string;
  } | null;
  if (!tokens?.access_token) throw new CalendarConnectionError('temporarily_unavailable');
  const seconds = Number(tokens.expires_in);
  const expiresAt = new Date(Date.now() + (Number.isFinite(seconds) && seconds > 0 ? seconds : 3600) * 1000).toISOString();
  const updated: CalendarTokens = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || previous.refreshToken,
    expiresAt, scope: tokens.scope || previous.scope,
  };
  // Persist renewal before allowing Calendar API calls using this access token.
  await storeCalendarTokens(userId, updated);
  return updated;
}

export async function getCalendarTokens(userId: string): Promise<CalendarTokens | null> {
  const connection = await getStoredCalendarTokens(userId);
  if (!connection) return null;
  if (!connection.refreshToken) throw new CalendarConnectionError('reconnect_required');
  const expiry = connection.expiresAt ? Date.parse(connection.expiresAt) : NaN;
  if (connection.accessToken && Number.isFinite(expiry) && expiry > Date.now() + REFRESH_EARLY_MS) return connection;
  // Several Calendar views can ask for a token simultaneously; share one refresh.
  const existing = inFlightRefreshes.get(userId);
  if (existing) return existing;
  const pending = renewCalendarTokens(userId, connection);
  inFlightRefreshes.set(userId, pending);
  try { return await pending; }
  finally { if (inFlightRefreshes.get(userId) === pending) inFlightRefreshes.delete(userId); }
}

export async function disconnectCalendar(userId: string) { await call('disconnect', { userId }); }
