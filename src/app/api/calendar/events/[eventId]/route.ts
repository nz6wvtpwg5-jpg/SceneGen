import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { calendarConnectionFailure, getCalendarTokens } from '@/lib/calendar-connection';
import { GoogleCalendarService } from '@/services/google-calendar';

/**
 * PATCH /api/calendar/events/[eventId]
 *
 * Update a specific Google Calendar event
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
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

    const { eventId } = params;
    const updates = await request.json();

    // Initialize Google Calendar service with tokens from cookies
    const calendarService = new GoogleCalendarService(accessToken, refreshToken);

    // Update the event
    await calendarService.updateEvent(eventId, updates);

    return NextResponse.json({
      success: true,
      message: 'Event updated successfully',
    });
  } catch (error) {
    const calendarFailure = calendarConnectionFailure(error);
    if (calendarFailure) return NextResponse.json(calendarFailure.body, { status: calendarFailure.status });
    console.error('Error updating calendar event:', error);
    return NextResponse.json(
      {
        error: 'Failed to update calendar event',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar/events/[eventId]
 *
 * Delete a specific Google Calendar event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
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
        { error: 'Google Calendar not connected' },
        { status: 401 }
      );
    }

    const { eventId } = params;

    // Initialize Google Calendar service with tokens from cookies
    const calendarService = new GoogleCalendarService(accessToken, refreshToken);

    // Delete the event
    await calendarService.deleteEvent(eventId);

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    const calendarFailure = calendarConnectionFailure(error);
    if (calendarFailure) return NextResponse.json(calendarFailure.body, { status: calendarFailure.status });
    console.error('Error deleting calendar event:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete calendar event',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
