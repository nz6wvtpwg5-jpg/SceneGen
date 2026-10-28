import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { calendarConnectionFailure, getCalendarTokens } from '@/lib/calendar-connection';
import { GoogleCalendarService } from '@/services/google-calendar';

/**
 * GET /api/calendar/events
 *
 * Fetch events from Google Calendar
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const connection = await getCalendarTokens(session.user.id);
    const accessToken = connection?.accessToken;
    const refreshToken = connection?.refreshToken || undefined;

    if (!accessToken) {
      // Return empty events instead of error - calendar not connected is not an error state
      return NextResponse.json({
        success: true,
        events: [],
        count: 0,
        message: 'Google Calendar not connected'
      });
    }

    // Get query parameters for date range
    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get('timeMin') || new Date().toISOString();
    const timeMax = searchParams.get('timeMax') || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // +90 days

    // Initialize Google Calendar service with tokens from cookies
    const calendarService = new GoogleCalendarService(accessToken, refreshToken);

    // Fetch events
    const events = await calendarService.getEvents(timeMin, timeMax);

    return NextResponse.json({
      success: true,
      events: events,
      count: events.length,
    });
  } catch (error) {
    const calendarFailure = calendarConnectionFailure(error);
    if (calendarFailure) return NextResponse.json(calendarFailure.body, { status: calendarFailure.status });
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch calendar events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/events
 *
 * Create a new event in Google Calendar
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const connection = await getCalendarTokens(session.user.id);
    const accessToken = connection?.accessToken;
    const refreshToken = connection?.refreshToken || undefined;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Google Calendar not connected. Please connect your calendar first.' },
        { status: 401 }
      );
    }

    const eventData = await request.json();

    // Initialize Google Calendar service with tokens from cookies
    const calendarService = new GoogleCalendarService(accessToken, refreshToken);

    // Create the event
    const createdEvent = await calendarService.createEvent(eventData);

    return NextResponse.json({
      success: true,
      event: createdEvent,
      message: 'Event created successfully',
    });
  } catch (error) {
    const calendarFailure = calendarConnectionFailure(error);
    if (calendarFailure) return NextResponse.json(calendarFailure.body, { status: calendarFailure.status });
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      {
        error: 'Failed to create calendar event',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
