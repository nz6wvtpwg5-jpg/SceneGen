# Google Calendar Integration for Shows - Implementation Guide

## 🎯 Overview

Integrate Google Calendar with SceneGen's Shows feature to allow users to:
- **Sync shows** to their Google Calendar automatically
- **View calendar events** alongside shows
- **Two-way sync** (optional) - import calendar events as shows
- **Manage calendar** settings and permissions

---

## 📋 Implementation Steps

### Phase 1: Setup Google OAuth 2.0

#### Step 1: Create Google Cloud Project

1. **Go to:** https://console.cloud.google.com/
2. **Create a new project** called "SceneGen Calendar Integration"
3. **Enable Google Calendar API:**
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

#### Step 2: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose **"External"** (for public use) or **"Internal"** (for your organization only)
3. Fill in required fields:
   - **App name:** SceneGen
   - **User support email:** your-email@scenegen.io
   - **App logo:** (upload your logo)
   - **Developer contact:** your-email@scenegen.io
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar` (Full calendar access)
   - OR `https://www.googleapis.com/auth/calendar.events` (Events only, more restricted)
5. Add test users (if in testing mode)
6. Save and continue

#### Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click **"Create Credentials"** → "OAuth client ID"
3. Choose **"Web application"**
4. Configure:
   - **Name:** SceneGen Web Client
   - **Authorized JavaScript origins:**
     - `http://localhost:3000` (development)
     - `https://your-domain.com` (production)
   - **Authorized redirect URIs:**
     - `http://localhost:3000/api/auth/callback/google-calendar`
     - `https://your-domain.com/api/auth/callback/google-calendar`
5. Click **"Create"**
6. **Save the Client ID and Client Secret** (you'll need these!)

---

### Phase 2: Install Dependencies

```bash
# Install Google APIs client
pnpm add googleapis

# Install additional auth helpers
pnpm add google-auth-library

# Type definitions
pnpm add -D @types/google.auth
```

---

### Phase 3: Environment Variables

Add to `.env.local`:

```bash
# Google Calendar Integration
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google-calendar
```

**For production (.env.production):**
```bash
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/callback/google-calendar
```

---

### Phase 4: NextAuth Google Provider Configuration

**File:** `/src/auth.ts`

Add Google Calendar provider to your NextAuth config:

```typescript
import GoogleProvider from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // ...existing Azure AD B2C provider

    // Add Google Calendar provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar.events'
          ].join(' '),
          access_type: 'offline', // Get refresh token
          prompt: 'consent', // Force consent screen to get refresh token
        }
      }
    }),
  ],

  callbacks: {
    async jwt({ token, account }) {
      // Save Google Calendar tokens
      if (account && account.provider === 'google') {
        token.googleAccessToken = account.access_token;
        token.googleRefreshToken = account.refresh_token;
        token.googleExpiresAt = account.expires_at;
      }
      return token;
    },

    async session({ session, token }) {
      // Add Google tokens to session
      session.googleAccessToken = token.googleAccessToken as string;
      session.googleRefreshToken = token.googleRefreshToken as string;
      session.googleExpiresAt = token.googleExpiresAt as number;
      return session;
    }
  }
});
```

---

### Phase 5: Create Google Calendar Service

**File:** `/src/services/google-calendar.ts`

```typescript
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

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
      console.error('Error creating calendar event:', error);
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
      console.error('Error updating calendar event:', error);
      throw new Error('Failed to update calendar event');
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
      console.error('Error deleting calendar event:', error);
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
        id: event.id,
        summary: event.summary || '',
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.start?.dateTime || event.start?.date || '',
          timeZone: event.start?.timeZone,
        },
        end: {
          dateTime: event.end?.dateTime || event.end?.date || '',
          timeZone: event.end?.timeZone,
        },
      }));
    } catch (error) {
      console.error('Error fetching calendar events:', error);
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
    } catch (error) {
      return false;
    }
  }
}

/**
 * Convert a show to a Google Calendar event
 */
export function showToCalendarEvent(show: any): CalendarEvent {
  return {
    summary: show.name || 'Show',
    description: show.description || '',
    location: show.venue ? `${show.venue.name}, ${show.venue.city}, ${show.venue.state}` : '',
    start: {
      dateTime: new Date(show.date).toISOString(),
      timeZone: 'America/New_York', // TODO: Get from user settings
    },
    end: {
      dateTime: new Date(new Date(show.date).getTime() + 3 * 60 * 60 * 1000).toISOString(), // +3 hours
      timeZone: 'America/New_York',
    },
  };
}
```

---

### Phase 6: Create API Routes

#### Connect Google Calendar

**File:** `/src/app/api/calendar/connect/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

/**
 * GET /api/calendar/connect
 *
 * Initiate Google Calendar OAuth flow
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Redirect to Google OAuth
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.GOOGLE_REDIRECT_URI!)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar.events')}` +
    `&access_type=offline` +
    `&prompt=consent`;

  return NextResponse.redirect(googleAuthUrl);
}
```

#### Sync Show to Calendar

**File:** `/src/app/api/calendar/sync/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { GoogleCalendarService, showToCalendarEvent } from '@/services/google-calendar';

/**
 * POST /api/calendar/sync
 *
 * Sync a show to Google Calendar
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.googleAccessToken) {
      return NextResponse.json(
        { error: 'Google Calendar not connected' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { showId, show } = body;

    // Initialize Google Calendar service
    const calendarService = new GoogleCalendarService(
      session.googleAccessToken,
      session.googleRefreshToken
    );

    // Convert show to calendar event
    const event = showToCalendarEvent(show);

    // Create calendar event
    const eventId = await calendarService.createEvent(event);

    // TODO: Save eventId to database (show.calendarEventId = eventId)
    // This allows us to update/delete the event later

    return NextResponse.json({
      success: true,
      eventId: eventId,
      message: 'Show synced to Google Calendar'
    });
  } catch (error) {
    console.error('Error syncing to calendar:', error);
    return NextResponse.json(
      { error: 'Failed to sync to calendar' },
      { status: 500 }
    );
  }
}
```

#### Check Calendar Status

**File:** `/src/app/api/calendar/status/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { GoogleCalendarService } from '@/services/google-calendar';

/**
 * GET /api/calendar/status
 *
 * Check if user has connected Google Calendar
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ connected: false });
    }

    if (!session.googleAccessToken) {
      return NextResponse.json({ connected: false });
    }

    // Verify access still works
    const calendarService = new GoogleCalendarService(
      session.googleAccessToken,
      session.googleRefreshToken
    );

    const hasAccess = await calendarService.hasCalendarAccess();

    return NextResponse.json({
      connected: hasAccess,
      email: session.user?.email,
    });
  } catch (error) {
    return NextResponse.json({ connected: false });
  }
}
```

---

### Phase 7: Update UI Components

#### Add Calendar Connect Button

**File:** `/src/components/shows/CalendarSyncButton.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CalendarSyncButtonProps {
  show: any;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function CalendarSyncButton({ show, variant = 'outline', size = 'default' }: CalendarSyncButtonProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkCalendarStatus();
  }, []);

  const checkCalendarStatus = async () => {
    try {
      const response = await fetch('/api/calendar/status');
      const data = await response.json();
      setIsConnected(data.connected);
      // TODO: Check if this specific show is already synced
    } catch (error) {
      console.error('Error checking calendar status:', error);
    }
  };

  const handleConnect = async () => {
    window.location.href = '/api/calendar/connect';
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showId: show.id,
          show: show,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync to calendar');
      }

      setIsSynced(true);
      toast({
        title: 'Synced to Calendar',
        description: 'Show added to your Google Calendar',
      });
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: 'Could not sync show to calendar',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isConnected) {
    return (
      <Button variant={variant} size={size} onClick={handleConnect}>
        <Calendar className="h-4 w-4 mr-2" />
        Connect Calendar
      </Button>
    );
  }

  if (isSynced) {
    return (
      <Button variant={variant} size={size} disabled>
        <Check className="h-4 w-4 mr-2" />
        Synced
      </Button>
    );
  }

  return (
    <Button variant={variant} size={size} onClick={handleSync} disabled={isSyncing}>
      {isSyncing ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Syncing...
        </>
      ) : (
        <>
          <Calendar className="h-4 w-4 mr-2" />
          Add to Calendar
        </>
      )}
    </Button>
  );
}
```

#### Update Shows Page

**File:** `/src/app/shows/page.tsx`

Add the CalendarSyncButton to show rows:

```typescript
import { CalendarSyncButton } from '@/components/shows/CalendarSyncButton';

// In your show table/list rendering:
<div className="flex gap-2">
  <CalendarSyncButton show={show} variant="outline" size="sm" />
  {/* Other action buttons */}
</div>
```

---

### Phase 8: Database Schema Updates

Add calendar sync tracking to your shows:

```sql
ALTER TABLE shows
ADD COLUMN calendarEventId VARCHAR(255),
ADD COLUMN syncedToCalendar BOOLEAN DEFAULT FALSE,
ADD COLUMN lastSyncedAt TIMESTAMP;

-- Index for quick lookups
CREATE INDEX idx_shows_calendar_event ON shows(calendarEventId);
```

---

### Phase 9: Advanced Features (Optional)

#### Automatic Sync

Add a toggle in user settings to automatically sync all new shows:

```typescript
// User settings
interface UserCalendarSettings {
  autoSyncShows: boolean;
  syncToCalendar: 'primary' | string; // Calendar ID
  reminderMinutes: number[]; // e.g., [60, 1440] for 1 hour and 1 day
}
```

#### Two-Way Sync

Import calendar events as shows:

```typescript
// Periodically check for new calendar events
async function importCalendarEvents(userId: string) {
  const calendarService = new GoogleCalendarService(token, refreshToken);

  const events = await calendarService.getEvents(
    new Date().toISOString(),
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Next 30 days
  );

  // Convert calendar events to shows
  for (const event of events) {
    // Check if event already exists
    // If not, create a new show
  }
}
```

---

## 🎯 Integration Checklist

### Setup Phase:
- [ ] Create Google Cloud Project
- [ ] Enable Google Calendar API
- [ ] Configure OAuth consent screen
- [ ] Create OAuth 2.0 credentials
- [ ] Add credentials to `.env.local`
- [ ] Install `googleapis` package

### Backend Phase:
- [ ] Create GoogleCalendarService
- [ ] Create API route: `/api/calendar/connect`
- [ ] Create API route: `/api/calendar/sync`
- [ ] Create API route: `/api/calendar/status`
- [ ] Add Google provider to NextAuth
- [ ] Update database schema for calendar tracking

### Frontend Phase:
- [ ] Create CalendarSyncButton component
- [ ] Add button to shows page
- [ ] Add calendar settings page
- [ ] Add connection status indicator
- [ ] Handle OAuth callback

### Testing Phase:
- [ ] Test OAuth flow
- [ ] Test event creation
- [ ] Test event updates
- [ ] Test token refresh
- [ ] Test error handling
- [ ] Test disconnection

---

## 🔐 Security Considerations

1. **Store tokens securely** - Use encrypted database columns for refresh tokens
2. **Implement token refresh** - Google tokens expire after 1 hour
3. **Scope minimization** - Only request calendar.events scope, not full calendar access
4. **User consent** - Always show what access you're requesting
5. **Revocation handling** - Handle cases where user revokes access
6. **Rate limiting** - Google Calendar API has quotas

---

## 📚 Documentation Links

- **Google Calendar API:** https://developers.google.com/calendar/api/guides/overview
- **OAuth 2.0:** https://developers.google.com/identity/protocols/oauth2
- **googleapis npm:** https://www.npmjs.com/package/googleapis
- **NextAuth Google Provider:** https://next-auth.js.org/providers/google

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
pnpm add googleapis google-auth-library

# 2. Add to .env.local
GOOGLE_CLIENT_ID=your-id
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google-calendar

# 3. Create the service file
# Copy GoogleCalendarService code above

# 4. Create API routes
# Copy route handlers above

# 5. Add button to shows page
# Import and use CalendarSyncButton

# 6. Test!
```

---

**Need help with any specific step? Let me know!** 🎉
