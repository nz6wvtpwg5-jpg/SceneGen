# SceneGen Backend Requirements - Complete Specification

**Date:** February 1, 2026
**Status:** Backend endpoints NOT YET IMPLEMENTED
**Frontend Status:** Ready and waiting for backend integration
**Last Updated:** February 1, 2026

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Critical Issues to Fix First](#critical-issues)
3. [Shows Endpoints (HIGHEST PRIORITY)](#shows-endpoints)
4. [Tours Endpoints](#tours-endpoints)
5. [Invites Endpoints](#invites-endpoints)
6. [Google Calendar Integration](#google-calendar-integration)
7. [Enhanced Contacts Endpoints](#enhanced-contacts-endpoints)
8. [User Profile Endpoints](#user-profile-endpoints)
9. [Notifications Endpoint](#notifications-endpoint)
10. [Database Schema Requirements](#database-schema-requirements)
11. [Authentication & Authorization](#authentication-authorization)
12. [Error Response Format](#error-response-format)
13. [Rate Limiting](#rate-limiting)
14. [Google Calendar API Integration](#google-calendar-api-integration)
15. [OpenAPI Specification Update](#openapi-specification-update)
16. [Testing Requirements](#testing-requirements)
17. [Deployment & Environment](#deployment-environment)
18. [Performance Requirements](#performance-requirements)
19. [Security Requirements](#security-requirements)
20. [Documentation Requirements](#documentation-requirements)
21. [Timeline Estimate](#timeline-estimate)
22. [Immediate Next Steps](#immediate-next-steps)

---

## � Executive Summary

The SceneGen frontend is fully built and functional, but the backend API is missing critical endpoints. This document provides a complete specification of what needs to be implemented in the backend to support all frontend features.

**Current Situation:**
- ✅ Frontend pages and UI components: **COMPLETE**
- ✅ Authentication flow: **WORKING**
- ✅ Contacts management: **WORKING**
- ✅ Entity creation (Artist/Promoter): **WORKING** (with fixes needed)
- ❌ Shows management: **MISSING BACKEND**
- ❌ Tours management: **MISSING BACKEND**
- ❌ Invites management: **MISSING BACKEND**
- ❌ Google Calendar integration: **MISSING BACKEND**
- ❌ Enhanced contact features: **PARTIALLY IMPLEMENTED**

---

## 🚨 CRITICAL ISSUES TO FIX FIRST

### 1. Entity Management
**Endpoint:** `POST /artist` and `POST /promoter`
**Issue:** Doesn't check if user already owns an entity
**Fix Required:**
```sql
-- Before creating entity:
SELECT id FROM entities WHERE administratorId = @userId

-- If result exists:
RETURN 409 Conflict with message: "User already owns an entity"

-- If no result:
INSERT INTO entities (...)
RETURN 201 Created
```

**Frontend Impact:** Prevents duplicate entities, stops redirect loops

---

### 2. Get User Entities
**Endpoint:** `GET /user/entities`
**Issue:** Returns error object or missing `administratorId` field
**Fix Required:**
```sql
SELECT
  id,
  administratorId,  -- ← MUST include this!
  entityType,
  name,
  city,
  state,
  country,
  bio,
  genres,
  profileImageUrl,
  headerImageUrl,
  ...
FROM entities
WHERE administratorId = @userId
```

**Frontend Impact:** Frontend needs `administratorId` to verify ownership

---

## 1. SHOWS ENDPOINTS (HIGHEST PRIORITY)

The shows feature is the core of SceneGen. Users need to manage their performance schedule.

### GET /api/shows
**Purpose:** Retrieve all shows for the authenticated user's entity

**Request:**
```
GET /api/shows
Headers:
  Authorization: Bearer {accessToken}
  Ocp-Apim-Subscription-Key: {subscriptionKey}
Query Parameters:
  startDate?: string (ISO 8601 date)
  endDate?: string (ISO 8601 date)
  tourId?: string (filter by tour)
  status?: string (upcoming|past|cancelled)
  entityId?: string (required - user's entity ID)
```

**Response:** 200 OK
```json
{
  "shows": [
    {
      "id": "string",
      "entityId": "string",
      "tourId": "string|null",
      "venueName": "string",
      "venueAddress": "string",
      "city": "string",
      "state": "string",
      "country": "string",
      "latitude": "number|null",
      "longitude": "number|null",
      "date": "string (ISO 8601)",
      "startTime": "string (HH:MM)",
      "endTime": "string|null (HH:MM)",
      "loadInTime": "string|null (HH:MM)",
      "soundCheckTime": "string|null (HH:MM)",
      "doorTime": "string|null (HH:MM)",
      "status": "confirmed|tentative|cancelled",
      "notes": "string|null",
      "fee": "number|null",
      "guaranteedFee": "number|null",
      "backendDeal": "string|null",
      "isPaid": "boolean",
      "capacity": "number|null",
      "ticketPrice": "number|null",
      "promoterName": "string|null",
      "promoterEmail": "string|null",
      "promoterPhone": "string|null",
      "contactIds": ["string"],
      "googleCalendarEventId": "string|null",
      "createdAt": "string (ISO 8601)",
      "updatedAt": "string (ISO 8601)"
    }
  ],
  "total": "number"
}
```

### POST /api/shows
**Purpose:** Create a new show

**Request:**
```json
{
  "entityId": "string (required)",
  "tourId": "string|null",
  "venueName": "string (required)",
  "venueAddress": "string (required)",
  "city": "string (required)",
  "state": "string",
  "country": "string",
  "latitude": "number|null",
  "longitude": "number|null",
  "date": "string (ISO 8601, required)",
  "startTime": "string (HH:MM, required)",
  "endTime": "string|null",
  "loadInTime": "string|null",
  "soundCheckTime": "string|null",
  "doorTime": "string|null",
  "status": "confirmed|tentative",
  "notes": "string|null",
  "fee": "number|null",
  "guaranteedFee": "number|null",
  "backendDeal": "string|null",
  "isPaid": "boolean",
  "capacity": "number|null",
  "ticketPrice": "number|null",
  "promoterName": "string|null",
  "promoterEmail": "string|null",
  "promoterPhone": "string|null",
  "contactIds": ["string"],
  "createCalendarEvent": "boolean"
}
```

**Response:** 201 Created with show object

### GET /api/shows/{id}
**Purpose:** Get a single show by ID

### PUT /api/shows/{id}
**Purpose:** Update an existing show

### DELETE /api/shows/{id}
**Purpose:** Delete/cancel a show

**Query Parameters:**
- `deleteCalendarEvent?: boolean` - Also delete from Google Calendar

---

## 2. TOURS ENDPOINTS

Tours group multiple shows together for easier management.

### GET /api/tours
**Purpose:** Retrieve all tours for the authenticated user's entity

**Response:** 200 OK
```json
{
  "tours": [
    {
      "id": "string",
      "entityId": "string",
      "name": "string",
      "description": "string|null",
      "startDate": "string (ISO 8601)",
      "endDate": "string (ISO 8601)",
      "status": "planning|active|completed|cancelled",
      "showCount": "number",
      "totalRevenue": "number",
      "createdAt": "string (ISO 8601)",
      "updatedAt": "string (ISO 8601)"
    }
  ],
  "total": "number"
}
```

### POST /api/tours
**Purpose:** Create a new tour

**Request:**
```json
{
  "entityId": "string (required)",
  "name": "string (required)",
  "description": "string|null",
  "startDate": "string (ISO 8601, required)",
  "endDate": "string (ISO 8601, required)",
  "status": "planning|active"
}
```

### GET /api/tours/{id}
**Purpose:** Get tour details including all associated shows

**Response:** 200 OK
```json
{
  "tour": {
    "id": "string",
    "entityId": "string",
    "name": "string",
    "description": "string|null",
    "startDate": "string",
    "endDate": "string",
    "status": "string",
    "shows": [
      /* array of show objects */
    ],
    "showCount": "number",
    "totalRevenue": "number"
  }
}
```

### PUT /api/tours/{id}
**Purpose:** Update tour details

### DELETE /api/tours/{id}
**Purpose:** Delete a tour (shows remain, just unlinked)

---

## 3. INVITES ENDPOINTS

Invites allow users to share contact lists and collaborate.

### GET /api/invites
**Purpose:** Get all invites (sent and received)

**Response:** 200 OK
```json
{
  "sent": [
    {
      "id": "string",
      "fromEntityId": "string",
      "toEmail": "string",
      "status": "pending|accepted|declined|expired",
      "message": "string|null",
      "permissions": {
        "canView": "boolean",
        "canEdit": "boolean",
        "canShare": "boolean"
      },
      "expiresAt": "string (ISO 8601)",
      "createdAt": "string (ISO 8601)",
      "acceptedAt": "string|null"
    }
  ],
  "received": [
    {
      "id": "string",
      "fromEntityId": "string",
      "fromEntityName": "string",
      "toEmail": "string",
      "status": "pending|accepted|declined|expired",
      "message": "string|null",
      "permissions": {
        "canView": "boolean",
        "canEdit": "boolean",
        "canShare": "boolean"
      },
      "expiresAt": "string (ISO 8601)",
      "createdAt": "string (ISO 8601)"
    }
  ]
}
```

### POST /api/invites
**Purpose:** Send an invite to collaborate

**Request:**
```json
{
  "toEmail": "string (required)",
  "message": "string|null",
  "permissions": {
    "canView": "boolean (default: true)",
    "canEdit": "boolean (default: false)",
    "canShare": "boolean (default: false)"
  },
  "expiresInDays": "number (default: 7)"
}
```

### POST /api/invites/{id}/accept
**Purpose:** Accept an invite

### POST /api/invites/{id}/decline
**Purpose:** Decline an invite

### DELETE /api/invites/{id}
**Purpose:** Revoke/delete an invite

---

## 4. GOOGLE CALENDAR INTEGRATION

Users can sync shows with Google Calendar.

### POST /api/calendar/connect
**Purpose:** Initialize Google Calendar OAuth flow

**Response:** 200 OK
```json
{
  "authUrl": "string (Google OAuth URL)"
}
```

### POST /api/calendar/callback
**Purpose:** Handle OAuth callback and store tokens

**Request:**
```json
{
  "code": "string (OAuth code)",
  "state": "string"
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "calendarId": "string"
}
```

### GET /api/calendar/status
**Purpose:** Check if user has connected Google Calendar

**Response:** 200 OK
```json
{
  "connected": "boolean",
  "calendarId": "string|null",
  "email": "string|null"
}
```

### POST /api/calendar/disconnect
**Purpose:** Disconnect Google Calendar

### POST /api/calendar/sync
**Purpose:** Manually sync shows to Google Calendar

**Request:**
```json
{
  "showIds": ["string"] // empty array = sync all
}
```

**Response:** 200 OK
```json
{
  "synced": "number",
  "errors": ["string"]
}
```

### POST /api/calendar/events
**Purpose:** Create a calendar event for a show

**Request:**
```json
{
  "showId": "string (required)",
  "summary": "string",
  "description": "string",
  "location": "string"
}
```

**Response:** 201 Created
```json
{
  "eventId": "string",
  "eventLink": "string"
}
```

### PUT /api/calendar/events/{eventId}
**Purpose:** Update a calendar event

### DELETE /api/calendar/events/{eventId}
**Purpose:** Delete a calendar event

---

## 5. ENHANCED CONTACTS ENDPOINTS

The current /api/contacts endpoint works but needs additional features.

### POST /api/contacts/import
**Purpose:** Import contacts from CSV/vCard

**Request:**
```
POST /api/contacts/import
Content-Type: multipart/form-data

file: <file>
format: "csv" | "vcard"
```

**Response:** 200 OK
```json
{
  "imported": "number",
  "failed": "number",
  "errors": ["string"]
}
```

### GET /api/contacts/export
**Purpose:** Export contacts to CSV

**Response:** 200 OK
```
Content-Type: text/csv
Content-Disposition: attachment; filename="contacts.csv"
```

### POST /api/contacts/bulk
**Purpose:** Bulk update/delete contacts

**Request:**
```json
{
  "action": "delete|update|tag",
  "contactIds": ["string"],
  "updates": { /* fields to update */ }
}
```

### GET /api/contacts/search
**Purpose:** Advanced contact search

**Query Parameters:**
- `q`: string (search term)
- `role`: string
- `city`: string
- `state`: string
- `tags`: string[] (comma-separated)

### POST /api/contacts/{id}/notes
**Purpose:** Add notes/history to a contact

**Request:**
```json
{
  "note": "string",
  "type": "call|email|meeting|other"
}
```

---

## 6. USER PROFILE ENDPOINTS

### GET /api/user/profile
**Purpose:** Get user profile and preferences

**Response:** 200 OK
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "preferences": {
    "timezone": "string",
    "dateFormat": "string",
    "currency": "string",
    "autoSyncCalendar": "boolean",
    "emailNotifications": "boolean"
  },
  "subscription": {
    "plan": "free|pro|enterprise",
    "status": "active|cancelled|expired",
    "expiresAt": "string|null"
  },
  "createdAt": "string (ISO 8601)"
}
```

### PUT /api/user/profile
**Purpose:** Update user profile

### PUT /api/user/preferences
**Purpose:** Update user preferences

---

## 7. NOTIFICATIONS ENDPOINT (Optional but Recommended)

### GET /api/notifications
**Purpose:** Get user notifications

**Response:** 200 OK
```json
{
  "notifications": [
    {
      "id": "string",
      "type": "show_reminder|invite|payment|sync_error",
      "title": "string",
      "message": "string",
      "read": "boolean",
      "actionUrl": "string|null",
      "createdAt": "string (ISO 8601)"
    }
  ],
  "unreadCount": "number"
}
```

### PUT /api/notifications/{id}/read
**Purpose:** Mark notification as read

### POST /api/notifications/mark-all-read
**Purpose:** Mark all notifications as read

---

## 8. DATABASE SCHEMA REQUIREMENTS

The backend needs these database tables:

### shows table
```sql
CREATE TABLE shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  venue_name VARCHAR(255) NOT NULL,
  venue_address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  country VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  load_in_time TIME,
  sound_check_time TIME,
  door_time TIME,
  status VARCHAR(20) DEFAULT 'confirmed',
  notes TEXT,
  fee DECIMAL(10, 2),
  guaranteed_fee DECIMAL(10, 2),
  backend_deal VARCHAR(100),
  is_paid BOOLEAN DEFAULT false,
  capacity INTEGER,
  ticket_price DECIMAL(10, 2),
  promoter_name VARCHAR(255),
  promoter_email VARCHAR(255),
  promoter_phone VARCHAR(50),
  google_calendar_event_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_entity_id (entity_id),
  INDEX idx_tour_id (tour_id),
  INDEX idx_date (date),
  INDEX idx_status (status)
);
```

### tours table
```sql
CREATE TABLE tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'planning',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_entity_id (entity_id),
  INDEX idx_status (status)
);
```

### show_contacts table
```sql
CREATE TABLE show_contacts (
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  role VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (show_id, contact_id),
  INDEX idx_show_id (show_id),
  INDEX idx_contact_id (contact_id)
);
```

### invites table
```sql
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  to_email VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  message TEXT,
  permissions JSONB,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,

  INDEX idx_from_entity_id (from_entity_id),
  INDEX idx_to_email (to_email),
  INDEX idx_status (status)
);
```

### calendar_connections table
```sql
CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) DEFAULT 'google',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP,
  calendar_id VARCHAR(255),
  calendar_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (user_id, provider),
  INDEX idx_user_id (user_id)
);
```

### notifications table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_read (read),
  INDEX idx_created_at (created_at)
);
```

### contact_notes table
```sql
CREATE TABLE contact_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_contact_id (contact_id),
  INDEX idx_user_id (user_id)
);
```

### user_preferences table
```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  date_format VARCHAR(50) DEFAULT 'MM/DD/YYYY',
  currency VARCHAR(10) DEFAULT 'USD',
  auto_sync_calendar BOOLEAN DEFAULT false,
  email_notifications BOOLEAN DEFAULT true,
  preferences JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 9. AUTHENTICATION & AUTHORIZATION

All endpoints must:
1. Validate the `Authorization: Bearer {token}` header
2. Validate the `Ocp-Apim-Subscription-Key` header
3. Ensure the user can only access their own entity's data
4. Return proper error responses:
   - **401 Unauthorized**: Missing or invalid token
   - **403 Forbidden**: Valid token but no permission
   - **404 Not Found**: Resource doesn't exist
   - **422 Unprocessable Entity**: Validation errors

---

## 10. ERROR RESPONSE FORMAT

All error responses should follow this format:

```json
{
  "error": {
    "code": "string (e.g., VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED)",
    "message": "string (human-readable)",
    "details": {
      "field": "string (for validation errors)",
      "reason": "string"
    }
  }
}
```

**Example error responses:**

```json
// Missing required field
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Venue name is required",
    "details": {
      "field": "venueName",
      "reason": "This field cannot be empty"
    }
  }
}

// Entity not found
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Show not found",
    "details": {
      "id": "abc-123",
      "reason": "No show exists with this ID"
    }
  }
}

// Duplicate entity
{
  "error": {
    "code": "ENTITY_ALREADY_EXISTS",
    "message": "User already owns an entity",
    "details": {
      "entityId": "existing-entity-id",
      "reason": "Users can only own one entity"
    }
  }
}
```

---

## 11. RATE LIMITING

Recommended rate limits:
- **GET endpoints**: 100 requests/minute
- **POST/PUT/DELETE endpoints**: 30 requests/minute
- **Calendar sync**: 10 requests/minute

Return headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

**Example:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1738454400
```

---

## 12. GOOGLE CALENDAR API INTEGRATION

Backend needs to:
1. Use **Google Calendar API v3**
2. Store OAuth tokens securely (encrypted at rest)
3. Refresh tokens automatically when expired
4. Handle Google API errors gracefully
5. Support these Calendar API operations:
   - Insert event
   - Update event
   - Delete event
   - List events (for sync)

**Required Google API Scopes:**
- `https://www.googleapis.com/auth/calendar.events`

**OAuth Flow:**
1. User clicks "Connect Google Calendar" in frontend
2. Frontend calls `POST /api/calendar/connect`
3. Backend generates OAuth URL with state token
4. User authorizes in Google
5. Google redirects to frontend callback
6. Frontend sends auth code to `POST /api/calendar/callback`
7. Backend exchanges code for tokens and stores them

**Token Refresh:**
```javascript
// Pseudo-code for token refresh
if (tokenExpiresAt < now()) {
  const newTokens = await refreshGoogleToken(refreshToken);
  await updateCalendarConnection({
    accessToken: newTokens.access_token,
    tokenExpiresAt: now() + newTokens.expires_in
  });
}
```

---

## 13. OPENAPI SPECIFICATION UPDATE

The backend team needs to update `/openapi/scenegen-api.openapi+json.json` with all these new endpoints.

**Currently missing:**
- ❌ All `/shows` endpoints
- ❌ All `/tours` endpoints
- ❌ All `/invites` endpoints
- ❌ All `/calendar` endpoints
- ❌ Enhanced `/contacts` endpoints

**Action required:**
1. Add all new endpoint definitions to OpenAPI spec
2. Include request/response schemas
3. Add authentication requirements
4. Document error responses
5. Version the API (e.g., v1)

---

## 14. TESTING REQUIREMENTS

Backend should include:

### Unit Tests
- Test each endpoint handler
- Test validation logic
- Test error handling
- Test database queries

### Integration Tests
- Complete user flows (create entity → create show → sync calendar)
- Authentication/authorization tests
- Database transaction tests
- Google Calendar integration tests (mocked)

### Test Coverage Target
**Minimum 80% code coverage**

**Example test cases:**
```javascript
// Shows endpoint tests
describe('POST /api/shows', () => {
  it('should create a show with valid data', async () => {
    // Test implementation
  });

  it('should return 401 if not authenticated', async () => {
    // Test implementation
  });

  it('should return 422 if venueName is missing', async () => {
    // Test implementation
  });

  it('should link show to tour if tourId provided', async () => {
    // Test implementation
  });
});
```

---

## 15. DEPLOYMENT & ENVIRONMENT

Backend needs these environment variables:

```bash
# Database
DATABASE_URL=[REDACTED_DATABASE_URL]
DATABASE_POOL_SIZE=20
DATABASE_SSL=true

# Azure AD B2C
AZURE_AD_B2C_TENANT_NAME=scenegenb2c
AZURE_AD_B2C_CLIENT_ID=your-client-id
AZURE_AD_B2C_CLIENT_SECRET=your-client-secret
AZURE_AD_B2C_POLICY=B2C_1_signupsignin

# Azure API Management
AZURE_APIM_SUBSCRIPTION_KEY=your-subscription-key
AZURE_APIM_ENDPOINT=https://api.scenegen.app

# Google Calendar
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://scenegen.app/api/calendar/callback

# Application Settings
JWT_SECRET=your-jwt-secret-key
API_BASE_URL=https://api.scenegen.app
CORS_ORIGINS=http://localhost:3000,https://scenegen.app
NODE_ENV=production
LOG_LEVEL=info

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password
```

---

## 16. PERFORMANCE REQUIREMENTS

- **Response time**: < 200ms for GET requests (95th percentile)
- **Response time**: < 500ms for POST/PUT requests (95th percentile)
- **Concurrent users**: Support 1000+ concurrent users
- **Database queries**: Use indexes, avoid N+1 queries
- **Caching**: Implement Redis for frequently accessed data

**Performance optimization tips:**
1. Index all foreign keys
2. Use database connection pooling
3. Cache user entities and profiles
4. Use lazy loading for large datasets
5. Paginate list endpoints (default: 50 items per page)

**Example pagination:**
```json
{
  "shows": [...],
  "pagination": {
    "page": 1,
    "perPage": 50,
    "total": 234,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 17. SECURITY REQUIREMENTS

1. **SQL Injection Protection**: Use parameterized queries or ORM
2. **XSS Protection**: Sanitize all user inputs
3. **CSRF Protection**: Validate origin headers
4. **Rate Limiting**: Prevent abuse (see section 11)
5. **Data Encryption**: Encrypt sensitive data at rest
6. **Token Security**: Store OAuth tokens encrypted
7. **HTTPS Only**: All endpoints require HTTPS in production
8. **Input Validation**: Validate all request payloads
9. **Output Encoding**: Encode all response data
10. **Audit Logging**: Log all create/update/delete operations

**Security headers:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

---

## 18. DOCUMENTATION REQUIREMENTS

Backend team should provide:

1. ✅ **Updated OpenAPI spec** (Swagger/OpenAPI 3.0)
2. ✅ **API documentation** with examples
3. ✅ **Database schema diagram**
4. ✅ **Setup/deployment instructions**
5. ✅ **Environment variables documentation**
6. ✅ **Testing instructions**
7. ✅ **Troubleshooting guide**

---

## 19. TIMELINE ESTIMATE

Recommended development timeline:

### Week 1-2: Core Shows Endpoints
- ✅ Database schema setup
- ✅ GET/POST/PUT/DELETE /api/shows
- ✅ Basic authentication/authorization
- ✅ Unit tests for shows endpoints

### Week 3: Tours Endpoints
- ✅ All /api/tours endpoints
- ✅ Show-tour relationships
- ✅ Tour management logic

### Week 4: Invites Endpoints
- ✅ All /api/invites endpoints
- ✅ Email notifications
- ✅ Invite expiration logic

### Week 5-6: Google Calendar Integration
- ✅ OAuth flow
- ✅ Event sync (create/update/delete)
- ✅ Token refresh mechanism
- ✅ Error handling for Google API

### Week 7: Enhanced Contacts + Profile
- ✅ Import/export contacts
- ✅ Advanced search
- ✅ Contact notes
- ✅ User preferences

### Week 8: Testing, Documentation, Deployment
- ✅ Integration tests
- ✅ Performance testing
- ✅ OpenAPI spec update
- ✅ Production deployment
- ✅ Monitoring and logging setup

---

## 20. IMMEDIATE NEXT STEPS

### For Backend Team:

1. **Fix critical entity issues** (Section: Critical Issues)
   - Add duplicate entity check to POST /artist and POST /promoter
   - Include `administratorId` in GET /user/entities response

2. **Set up database** with all required tables (Section 8)
   - Create migration scripts
   - Add indexes
   - Set up foreign key constraints

3. **Implement Shows endpoints** (Section 1) - **HIGHEST PRIORITY**
   - Start with GET /api/shows (read-only)
   - Then POST /api/shows (create)
   - Then PUT/DELETE (update/delete)

4. **Test with frontend** using these curl commands:
   ```bash
   # Test GET /api/shows
   curl -X GET "https://api.scenegen.app/api/shows?entityId={your-entity-id}" \
     -H "Authorization: Bearer {token}" \
     -H "Ocp-Apim-Subscription-Key: {key}"

   # Test POST /api/shows
   curl -X POST "https://api.scenegen.app/api/shows" \
     -H "Authorization: Bearer {token}" \
     -H "Ocp-Apim-Subscription-Key: {key}" \
     -H "Content-Type: application/json" \
     -d '{
       "entityId": "your-entity-id",
       "venueName": "Test Venue",
       "venueAddress": "123 Main St",
       "city": "New York",
       "date": "2026-03-15",
       "startTime": "20:00"
     }'
   ```

5. **Update OpenAPI spec** as you implement each endpoint

6. **Coordinate with frontend team** for integration testing

### For Frontend Team:

1. ✅ **Frontend is ready and waiting**
2. ✅ **Error handling is in place**
3. ✅ **All UI components are built**
4. ⏳ Monitor this document for backend progress updates
5. ⏳ Test integration as soon as endpoints are available
6. ⏳ Report any issues or discrepancies

---

## 21. QUESTIONS FOR BACKEND TEAM

1. What is your preferred database? (PostgreSQL, MySQL, MongoDB?)
2. What backend framework are you using? (Node.js/Express, .NET, Python/Django, Go?)
3. Do you have CI/CD pipelines set up?
4. What is your testing strategy? (Jest, Mocha, pytest, etc.?)
5. When can we expect the first endpoints (Shows) to be available?
6. Do you need any clarification on the requirements?
7. Do you have experience with Google Calendar API integration?
8. What's your plan for handling database migrations?

---

## 22. FRONTEND FILE REFERENCES

These frontend files are already implemented and ready:

### Shows Pages
- `/src/app/shows/page.tsx` - Main shows list page with calendar view
- `/src/app/shows/new/page.tsx` - Create new show form
- `/src/app/shows/[id]/page.tsx` - Show details page
- `/src/app/shows/[id]/edit/page.tsx` - Edit show form

### API Routes (Proxies)
- `/src/app/api/shows/route.ts` - GET/POST shows proxy
- `/src/app/api/shows/[id]/route.ts` - GET/PUT/DELETE single show
- `/src/app/api/tours/route.ts` - Tours endpoints proxy
- `/src/app/api/invites/route.ts` - Invites endpoints proxy
- `/src/app/api/calendar/route.ts` - Calendar endpoints proxy

### React Hooks
- `/src/hooks/useShows.ts` - Fetch and manage shows
- `/src/hooks/useTours.ts` - Fetch and manage tours
- `/src/hooks/useInvites.ts` - Fetch and manage invites
- `/src/hooks/useCalendar.ts` - Google Calendar integration

### Components
- `/src/components/shows/ShowCard.tsx` - Show list item
- `/src/components/shows/CalendarEventModal.tsx` - Calendar event editing
- `/src/components/shows/ShowForm.tsx` - Create/edit show form
- `/src/components/shows/ShowDetailsCard.tsx` - Show details display
- `/src/components/tours/TourCard.tsx` - Tour list item
- `/src/components/invites/InviteCard.tsx` - Invite list item
- `/src/components/ui/PlacesAutocomplete.tsx` - Location autocomplete

---

## 23. WORKING ENDPOINTS (Reference)

These endpoints are already working:

✅ **Authentication:**
- Azure AD B2C login/logout
- Token refresh

✅ **Entities:**
- POST /artist (needs duplicate check fix)
- POST /promoter (needs duplicate check fix)
- GET /user/entities (needs administratorId field)

✅ **Contacts:**
- GET /api/contacts
- POST /api/contacts
- PUT /api/contacts/{id}
- DELETE /api/contacts/{id}

---

## APPENDIX A: Example Frontend API Calls

How the frontend is currently calling the backend:

```typescript
// Example from /src/hooks/useShows.ts
const fetchShows = async () => {
  const response = await fetch('/api/shows', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Ocp-Apim-Subscription-Key': subscriptionKey,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch shows');
  }

  const data = await response.json();
  return data.shows;
};

// Example from /src/app/shows/new/page.tsx
const createShow = async (showData) => {
  const response = await fetch('/api/shows', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Ocp-Apim-Subscription-Key': subscriptionKey,
    },
    body: JSON.stringify(showData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create show');
  }

  return await response.json();
};
```

---

## APPENDIX B: Database Migration Example

Example migration script for shows table:

```sql
-- Migration: 001_create_shows_table.sql
-- Description: Create shows table with all required fields
-- Date: 2026-02-01

BEGIN;

CREATE TABLE IF NOT EXISTS shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL,
  tour_id UUID,
  venue_name VARCHAR(255) NOT NULL,
  venue_address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'USA',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  load_in_time TIME,
  sound_check_time TIME,
  door_time TIME,
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
  notes TEXT,
  fee DECIMAL(10, 2),
  guaranteed_fee DECIMAL(10, 2),
  backend_deal VARCHAR(100),
  is_paid BOOLEAN DEFAULT false,
  capacity INTEGER,
  ticket_price DECIMAL(10, 2),
  promoter_name VARCHAR(255),
  promoter_email VARCHAR(255),
  promoter_phone VARCHAR(50),
  google_calendar_event_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints
ALTER TABLE shows
  ADD CONSTRAINT fk_shows_entity
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE;

ALTER TABLE shows
  ADD CONSTRAINT fk_shows_tour
  FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX idx_shows_entity_id ON shows(entity_id);
CREATE INDEX idx_shows_tour_id ON shows(tour_id);
CREATE INDEX idx_shows_date ON shows(date);
CREATE INDEX idx_shows_status ON shows(status);
CREATE INDEX idx_shows_city ON shows(city);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shows_updated_at
  BEFORE UPDATE ON shows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

---

## Contact Information

**Frontend Developer:** Jon
**Project:** SceneGen MVP
**Repository:** Jon/Newstuff branch
**Date Created:** February 1, 2026
**Last Updated:** February 1, 2026

---

**End of Backend Requirements Document**

✅ This document should be updated as backend development progresses.
✅ Please mark sections as complete when implemented.
✅ Report any issues or questions to the frontend team.

---

## 🚀 QUICK START FOR BACKEND DEVS

**Don't know where to start? Follow this:**

1. **Read Section 0** (Critical Issues) - Fix entity endpoints first
2. **Read Section 1** (Shows Endpoints) - This is your main deliverable
3. **Read Section 8** (Database Schema) - Set up your database
4. **Read Section 9** (Auth) - Understand authentication requirements
5. **Read Section 14** (Testing) - Write tests as you go
6. **Read Section 20** (Next Steps) - Your action items

**Priority order:**
1. Fix entity duplicate check ← **DO THIS FIRST**
2. Implement GET /api/shows ← **DO THIS SECOND**
3. Implement POST /api/shows
4. Implement PUT /DELETE /api/shows
5. Move on to Tours, then Calendar, then Invites

Good luck! 🎉
