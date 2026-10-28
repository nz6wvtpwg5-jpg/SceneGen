import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { CalendarConnectionError } from '@/lib/calendar-connection';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string }>;
}

function rethrowAuthFailure(error: unknown) {
  const e = error as { code?: number | string; response?: { status?: number; data?: { error?: string } } };
  if (e?.code === 401 || e?.response?.status === 401 || e?.response?.data?.error === 'invalid_grant') {
    throw new CalendarConnectionError('reconnect_required');
  }
}

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;

  constructor(accessToken: string, refreshToken?: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  /**
   * Create a calendar event from a show
   */
  async createEvent(event: CalendarEvent): Promise<string> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      return response.data.id!;
    } catch (error) {
      rethrowAuthFailure(error);
      console.error('Google Calendar event creation failed');
      throw new Error('Failed to create calendar event');
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(eventId: string, event: CalendarEvent): Promise<void> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: event,
      });
    } catch (error) {
      rethrowAuthFailure(error);
      const googleError = error as {
        code?: number | string;
        message?: string;
        response?: {
          status?: number;
          data?: {
            error?: {
              code?: number;
              message?: string;
              status?: string;
              errors?: Array<{
                reason?: string;
                message?: string;
              }>;
            };
          };
        };
      };

      const providerError = googleError.response?.data?.error;
      const providerStatus =
        googleError.response?.status ||
        providerError?.code ||
        googleError.code;
      const providerMessage =
        providerError?.message ||
        googleError.message ||
        'Unknown Google Calendar error';
      const providerReason =
        providerError?.errors?.[0]?.reason ||
        providerError?.status;

      console.error('Google Calendar event update failed', {
        eventId,
        status: providerStatus,
        reason: providerReason,
        message: providerMessage,
      });

      const providerDetails = providerStatus
        ? ` (Google ${providerStatus}: ${providerMessage})`
        : `: ${providerMessage}`;

      throw new Error(
        `Failed to update calendar event${providerDetails}`
      );
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string): Promise<void> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });
    } catch (error) {
      rethrowAuthFailure(error);
      const providerStatus = (error as { code?: number; response?: { status?: number } })?.code
        || (error as { response?: { status?: number } })?.response?.status;
      // A missing provider event already satisfies the requested end state.
      if (providerStatus === 404) return;
      console.error('Google Calendar event deletion failed');
      throw new Error('Failed to delete calendar event');
    }
  }

  /**
   * Get events from calendar
   */
  async getEvents(timeMin: string, timeMax: string): Promise<CalendarEvent[]> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin,
        timeMax: timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return (response.data.items || []).map(event => ({
        id: event.id || undefined,
        summary: event.summary || '',
        description: event.description || undefined,
        location: event.location || undefined,
        start: {
          dateTime: event.start?.dateTime || event.start?.date || '',
          timeZone: event.start?.timeZone || undefined,
        },
        end: {
          dateTime: event.end?.dateTime || event.end?.date || '',
          timeZone: event.end?.timeZone || undefined,
        },
      }));
    } catch (error) {
      rethrowAuthFailure(error);
      console.error('Google Calendar event fetch failed');
      throw new Error('Failed to fetch calendar events');
    }
  }

  /**
   * Check if user has calendar access
   */
  async hasCalendarAccess(): Promise<boolean> {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      await calendar.calendarList.list();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Convert a show to a Google Calendar event
 */
export function showToCalendarEvent(show: any, timeZone = 'UTC'): CalendarEvent {
  const showDate = String(show.showDate || show.date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(showDate)) throw new Error('Show date is invalid');
  const [year, month, day] = showDate.split('-').map(Number);
  const parsedDate = new Date(`${showDate}T00:00:00Z`);
  if (
    Number.isNaN(parsedDate.getTime())
    || parsedDate.getUTCFullYear() !== year
    || parsedDate.getUTCMonth() + 1 !== month
    || parsedDate.getUTCDate() !== day
  ) throw new Error('Show date is invalid');

  const normalizeTime = (value: unknown, fallback: string) => {
    const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
    if (!match) return fallback;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    return hours < 24 && minutes < 60 ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}` : fallback;
  };
  const startTime = normalizeTime(show.showTime || show.startTime, '20:00');
  let endTime = normalizeTime(show.endTime, '');
  if (!endTime) {
    const [hour, minute] = startTime.split(':').map(Number);
    endTime = `${String((hour + 3) % 24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
  const nextDate = (date: string) => {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + 1);
    return value.toISOString().slice(0, 10);
  };
  const endDate = endTime <= startTime ? nextDate(showDate) : showDate;
  const venue = show.venue || {};
  const venueName = show.venueName || venue.name;
  const location = [venueName, show.venueAddress || venue.address, show.venueCity || venue.city, show.venueState || venue.state, show.venueCountry || venue.country].filter(Boolean).join(', ');

  return {
    summary: show.name || venueName || 'Show',
    description: show.description || show.notes || `Show at ${venueName || 'venue'}`,
    location: location || show.location || '',
    start: {
      dateTime: `${showDate}T${startTime}:00`,
      timeZone,
    },
    end: {
      dateTime: `${endDate}T${endTime}:00`,
      timeZone,
    },
  };
}
