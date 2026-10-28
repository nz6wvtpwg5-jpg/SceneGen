import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { calendarConnectionFailure, getCalendarTokens } from '@/lib/calendar-connection';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ connected: false }, { status: 401 });
  try {
    const tokens = await getCalendarTokens(session.user.id);
    return NextResponse.json({ connected: Boolean(tokens?.accessToken), email: session.user.email });
  } catch (error) {
    const failure = calendarConnectionFailure(error);
    if (failure?.status === 401) return NextResponse.json({ connected: false, reconnectRequired: true });
    return NextResponse.json({ connected: false, temporarilyUnavailable: true }, { status: 503 });
  }
}
