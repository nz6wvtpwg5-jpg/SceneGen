# SceneGen Backend Requirements & API Specification

**Date:** January 28, 2026
**Version:** 1.0
**Target:** Azure Backend Team
**Priority:** Critical Path Items for MVP Launch

---

## 📋 Table of Contents

1. [Critical Fixes Required](#critical-fixes-required)
2. [Missing Endpoints - Shows Management](#shows-management-api)
3. [Missing Endpoints - Tours Management](#tours-management-api)
4. [Data Models & Schemas](#data-models--schemas)
5. [Authentication & Authorization](#authentication--authorization)
6. [Error Handling Standards](#error-handling-standards)
7. [Testing Requirements](#testing-requirements)
8. [Deployment Checklist](#deployment-checklist)

---

## 🚨 CRITICAL FIXES REQUIRED

### Priority 1: Fix GET /user/entities

**Current State:**
```json
// OpenAPI schema: entitiesMenuViewModel
{
  "name": "string",
  "id": "string (uuid)",
  "entityType": "string"
}
```

**Problem:**
- Missing `administratorId` field
- Frontend cannot verify entity ownership
- Causes redirect loops in onboarding flow
- Frontend has to implement hacky bypass workarounds

**Required Change:**
```json
// Return full entity objects, not just menu items
[
  {
    "id": "string (uuid)",
    "administratorId": "string (uuid)",  // ← CRITICAL - Must include!
    "entityType": "artist" | "promoter",
    "name": "string",
    "alias": "string",
    "city": "string",
    "state": "string",
    "country": "string",
    "bio": "string",
    "profileImageUrl": "string",
    "headerImageUrl": "string",
    "genres": ["string"],
    "members": [
      {
        "id": "string",
        "name": "string",
        "responsibility": "string"
      }
    ],
    "socialLinks": {
      "spotify": "string",
      "instagram": "string",
      "facebook": "string",
      "website": "string"
    },
    "assets": [
      {
        "uri": "string",
        "extension": "string",
        "fileId": "string",
        "mimeType": "string"
      }
    ],
    "createdAt": "string (ISO 8601)",
    "updatedAt": "string (ISO 8601)"
  }
]
```

**SQL Query Example:**
```sql
SELECT
  e.id,
  e.administratorId,          -- MUST INCLUDE
  e.entityType,
  e.name,
  e.alias,
  e.city,
  e.state,
  e.country,
  e.bio,
  e.profileImageUrl,
  e.headerImageUrl,
  e.genres,
  e.createdAt,
  e.updatedAt,
  -- Include related data
  m.members,
  a.assets,
  s.socialLinks
FROM entities e
LEFT JOIN members m ON m.entityId = e.id
LEFT JOIN assets a ON a.entityId = e.id
LEFT JOIN socialLinks s ON s.entityId = e.id
WHERE e.administratorId = @userId
ORDER BY e.createdAt DESC
```

**API Endpoint:**
```
GET /user/entities
Authorization: Bearer {token}
Ocp-Apim-Subscription-Key: {key}

Response: 200 OK
Content-Type: application/json
[
  {full entity object as shown above}
]
```

**Testing:**
```bash
curl -X GET \
  "https://scenegen-apim.azure-api.net/scenegen-api/user/entities" \
  -H "Authorization: Bearer {token}" \
  -H "Ocp-Apim-Subscription-Key: {key}" \
  | jq '.[] | {id, administratorId, entityType, name}'
```

**Acceptance Criteria:**
- ✅ Returns array of full entity objects
- ✅ Each object includes `administratorId` field
- ✅ All profile fields are populated
- ✅ Returns empty array `[]` if user has no entities
- ✅ Returns 401 if unauthorized
- ✅ Returns 500 with error message if database error

---

### Priority 2: Add Duplicate Entity Check

**Current State:**
- POST `/artist/add` and POST `/promoter/add` allow creating multiple entities
- No validation for entity ownership
- Users can accidentally create duplicate profiles

**Required Change:**

**Before inserting entity, check ownership:**
```sql
-- Check if user already owns an entity
SELECT id
FROM entities
WHERE administratorId = @userId
LIMIT 1;

-- If result exists:
--   RETURN 409 Conflict
-- Else:
--   INSERT entity
--   RETURN 200 OK
```

**API Endpoints:**

```
POST /artist/add
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "name": "Electric Horizon",
  "city": "Brooklyn",
  "state": "New York",
  "country": "United States",
  "bio": "Indie rock band from Brooklyn..."
}

Response: 200 OK (if no existing entity)
{
  "id": "uuid",
  "administratorId": "uuid",
  "entityType": "artist",
  "name": "Electric Horizon",
  ...
}

Response: 409 Conflict (if user already owns entity)
{
  "error": "You already own an entity",
  "code": "DUPLICATE_ENTITY",
  "existingEntityId": "uuid",
  "existingEntityType": "artist"
}
```

**Same for POST /promoter/add:**
```
POST /promoter/add
(Same logic as artist/add)
```

**Implementation Logic:**
```typescript
// Pseudocode for backend
async function createArtist(userId: string, data: ArtistInput) {
  // 1. Check existing entity
  const existingEntity = await db.query(
    'SELECT id, entityType FROM entities WHERE administratorId = ?',
    [userId]
  );

  // 2. Return 409 if exists
  if (existingEntity) {
    return {
      status: 409,
      body: {
        error: "You already own an entity",
        code: "DUPLICATE_ENTITY",
        existingEntityId: existingEntity.id,
        existingEntityType: existingEntity.entityType
      }
    };
  }

  // 3. Create entity
  const entity = await db.insert('entities', {
    administratorId: userId,
    entityType: 'artist',
    name: data.name,
    city: data.city,
    state: data.state,
    country: data.country,
    bio: data.bio,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // 4. Return created entity
  return {
    status: 200,
    body: entity
  };
}
```

**Testing:**
```bash
# Test 1: Create first entity (should succeed)
curl -X POST \
  "https://scenegen-apim.azure-api.net/scenegen-api/artist/add" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Band",
    "city": "Brooklyn",
    "country": "United States"
  }'
# Expected: 200 OK

# Test 2: Try to create second entity (should fail)
curl -X POST \
  "https://scenegen-apim.azure-api.net/scenegen-api/artist/add" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Another Band",
    "city": "Manhattan",
    "country": "United States"
  }'
# Expected: 409 Conflict with error message
```

**Acceptance Criteria:**
- ✅ First entity creation succeeds (200 OK)
- ✅ Second entity creation fails (409 Conflict)
- ✅ Error response includes existing entity info
- ✅ Works for both artists and promoters
- ✅ Check is race-condition safe (use transaction)

---

## 📦 SHOWS MANAGEMENT API

**Status:** Not in OpenAPI spec - Needs implementation

### Overview
Shows represent live music events/gigs. Artists and promoters need to:
- Create and manage show bookings
- Track show status (proposed, confirmed, cancelled)
- Associate shows with tours
- Filter and search shows
- Bulk update multiple shows

### Data Model

**Show Entity:**
```typescript
interface Show {
  // Core fields
  id: string;                    // UUID
  entityId: string;              // UUID - Artist or Promoter who owns this
  createdBy: string;             // UUID - User who created

  // Event details
  date: string;                  // ISO 8601 date-time
  venue: string;                 // Venue name
  city: string;
  state?: string;                // Optional (not all countries have states)
  country: string;

  // Status tracking
  status: 'proposed' | 'confirmed' | 'cancelled';

  // Tour association
  tourId?: string;               // UUID - Optional
  tourName?: string;             // Denormalized for display

  // Financial
  fee?: number;                  // Payment amount
  currency?: string;             // USD, EUR, etc. (default: USD)

  // Additional info
  notes?: string;                // Internal notes

  // Relationships
  promoterId?: string;           // UUID - If artist, who's the promoter
  artistId?: string;             // UUID - If promoter, who's the artist

  // Metadata
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}
```

**Database Schema:**
```sql
CREATE TABLE shows (
  id VARCHAR(36) PRIMARY KEY,
  entityId VARCHAR(36) NOT NULL,
  createdBy VARCHAR(36) NOT NULL,

  date DATETIME NOT NULL,
  venue VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  country VARCHAR(100) NOT NULL,

  status VARCHAR(20) NOT NULL DEFAULT 'proposed',
  CHECK (status IN ('proposed', 'confirmed', 'cancelled')),

  tourId VARCHAR(36),
  tourName VARCHAR(255),

  fee DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',

  notes TEXT,

  promoterId VARCHAR(36),
  artistId VARCHAR(36),

  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_entityId (entityId),
  INDEX idx_date (date),
  INDEX idx_status (status),
  INDEX idx_tourId (tourId),

  FOREIGN KEY (entityId) REFERENCES entities(id) ON DELETE CASCADE,
  FOREIGN KEY (tourId) REFERENCES tours(id) ON DELETE SET NULL,
  FOREIGN KEY (promoterId) REFERENCES entities(id) ON DELETE SET NULL,
  FOREIGN KEY (artistId) REFERENCES entities(id) ON DELETE SET NULL
);
```

---

### API Endpoints

#### 1. GET /shows - List Shows

**Purpose:** Retrieve all shows for the current user's entity

**Endpoint:**
```
GET /shows
GET /shows?status={status}
GET /shows?tourId={tourId}
GET /shows?status={status}&tourId={tourId}

Authorization: Bearer {token}
Ocp-Apim-Subscription-Key: {key}
```

**Query Parameters:**
- `status` (optional): Filter by status (proposed, confirmed, cancelled)
- `tourId` (optional): Filter by tour
- `from` (optional): Date range start (ISO 8601)
- `to` (optional): Date range end (ISO 8601)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 50, max: 100)

**Response: 200 OK**
```json
{
  "shows": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "entityId": "user-entity-id",
      "createdBy": "user-id",
      "date": "2026-03-15T20:00:00Z",
      "venue": "The Bowery Ballroom",
      "city": "New York",
      "state": "New York",
      "country": "United States",
      "status": "confirmed",
      "tourId": "tour-uuid",
      "tourName": "Spring Tour 2026",
      "fee": 1500.00,
      "currency": "USD",
      "notes": "Load in at 6pm",
      "promoterId": "promoter-entity-id",
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-20T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  }
}
```

**Response: 401 Unauthorized**
```json
{
  "error": "Unauthorized",
  "code": "AUTH_REQUIRED"
}
```

**SQL Query:**
```sql
SELECT
  s.*,
  t.name as tourName
FROM shows s
LEFT JOIN tours t ON s.tourId = t.id
WHERE s.entityId = @entityId
  AND (@status IS NULL OR s.status = @status)
  AND (@tourId IS NULL OR s.tourId = @tourId)
  AND (@from IS NULL OR s.date >= @from)
  AND (@to IS NULL OR s.date <= @to)
ORDER BY s.date ASC
LIMIT @limit OFFSET @offset;
```

---

#### 2. POST /shows - Create Show

**Purpose:** Create a new show booking

**Endpoint:**
```
POST /shows
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "date": "2026-03-15T20:00:00Z",
  "venue": "The Bowery Ballroom",
  "city": "New York",
  "state": "New York",
  "country": "United States",
  "status": "proposed",
  "tourId": "optional-tour-uuid",
  "fee": 1500.00,
  "currency": "USD",
  "notes": "Load in at 6pm",
  "promoterId": "optional-promoter-entity-id"
}
```

**Validation Rules:**
- ✅ `date` is required and must be valid ISO 8601 format
- ✅ `venue` is required (max 255 chars)
- ✅ `city` is required (max 100 chars)
- ✅ `country` is required (max 100 chars)
- ✅ `status` must be one of: proposed, confirmed, cancelled (default: proposed)
- ✅ `fee` must be positive number if provided
- ✅ `tourId` must exist if provided (validate FK)

**Response: 201 Created**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "entityId": "user-entity-id",
  "createdBy": "user-id",
  "date": "2026-03-15T20:00:00Z",
  "venue": "The Bowery Ballroom",
  "city": "New York",
  "state": "New York",
  "country": "United States",
  "status": "proposed",
  "tourId": null,
  "tourName": null,
  "fee": 1500.00,
  "currency": "USD",
  "notes": "Load in at 6pm",
  "promoterId": null,
  "artistId": null,
  "createdAt": "2026-01-28T10:00:00Z",
  "updatedAt": "2026-01-28T10:00:00Z"
}
```

**Response: 400 Bad Request**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "date",
      "message": "Date is required and must be valid ISO 8601 format"
    }
  ]
}
```

**Response: 404 Not Found** (if tourId provided but doesn't exist)
```json
{
  "error": "Tour not found",
  "code": "TOUR_NOT_FOUND",
  "tourId": "invalid-tour-id"
}
```

---

#### 3. GET /shows/{id} - Get Show Details

**Purpose:** Retrieve a specific show by ID

**Endpoint:**
```
GET /shows/{id}
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "entityId": "user-entity-id",
  ...full show object...
}
```

**Response: 404 Not Found**
```json
{
  "error": "Show not found",
  "code": "SHOW_NOT_FOUND",
  "showId": "invalid-id"
}
```

**Response: 403 Forbidden** (if show belongs to different entity)
```json
{
  "error": "Access denied",
  "code": "FORBIDDEN",
  "message": "You don't have permission to view this show"
}
```

**Authorization Check:**
```sql
SELECT * FROM shows
WHERE id = @showId
  AND entityId = @userEntityId;
```

---

#### 4. PATCH /shows/{id} - Update Show

**Purpose:** Update an existing show

**Endpoint:**
```
PATCH /shows/{id}
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:** (all fields optional)
```json
{
  "date": "2026-03-16T20:00:00Z",
  "venue": "Updated Venue",
  "city": "Updated City",
  "state": "Updated State",
  "country": "Updated Country",
  "status": "confirmed",
  "tourId": "tour-uuid",
  "fee": 2000.00,
  "currency": "USD",
  "notes": "Updated notes"
}
```

**Response: 200 OK**
```json
{
  ...updated show object...
}
```

**Response: 404 Not Found**
```json
{
  "error": "Show not found",
  "code": "SHOW_NOT_FOUND"
}
```

**Response: 403 Forbidden**
```json
{
  "error": "Access denied",
  "code": "FORBIDDEN"
}
```

**SQL Update:**
```sql
UPDATE shows
SET
  date = COALESCE(@date, date),
  venue = COALESCE(@venue, venue),
  city = COALESCE(@city, city),
  state = COALESCE(@state, state),
  country = COALESCE(@country, country),
  status = COALESCE(@status, status),
  tourId = COALESCE(@tourId, tourId),
  fee = COALESCE(@fee, fee),
  notes = COALESCE(@notes, notes),
  updatedAt = CURRENT_TIMESTAMP
WHERE id = @showId
  AND entityId = @userEntityId;
```

---

#### 5. DELETE /shows/{id} - Delete Show

**Purpose:** Delete a show (soft delete recommended)

**Endpoint:**
```
DELETE /shows/{id}
Authorization: Bearer {token}
```

**Response: 204 No Content**
(Empty response body on success)

**Response: 404 Not Found**
```json
{
  "error": "Show not found",
  "code": "SHOW_NOT_FOUND"
}
```

**Response: 403 Forbidden**
```json
{
  "error": "Access denied",
  "code": "FORBIDDEN"
}
```

**Implementation Options:**

**Option A: Hard Delete**
```sql
DELETE FROM shows
WHERE id = @showId
  AND entityId = @userEntityId;
```

**Option B: Soft Delete (Recommended)**
```sql
ALTER TABLE shows ADD COLUMN deletedAt DATETIME;
ALTER TABLE shows ADD COLUMN deletedBy VARCHAR(36);

UPDATE shows
SET
  deletedAt = CURRENT_TIMESTAMP,
  deletedBy = @userId
WHERE id = @showId
  AND entityId = @userEntityId;

-- Update all queries to exclude deleted:
-- WHERE deletedAt IS NULL
```

---

#### 6. POST /shows/bulk-update - Bulk Update Shows

**Purpose:** Update multiple shows at once (for bulk status changes)

**Endpoint:**
```
POST /shows/bulk-update
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "showIds": [
    "show-id-1",
    "show-id-2",
    "show-id-3"
  ],
  "updates": {
    "status": "confirmed",
    "tourId": "tour-uuid"
  }
}
```

**Validation:**
- ✅ `showIds` must be non-empty array
- ✅ `updates` must contain at least one field
- ✅ All shows must belong to user's entity
- ✅ Max 100 shows per request

**Response: 200 OK**
```json
{
  "updated": 3,
  "failed": 0,
  "results": [
    {
      "id": "show-id-1",
      "status": "success"
    },
    {
      "id": "show-id-2",
      "status": "success"
    },
    {
      "id": "show-id-3",
      "status": "success"
    }
  ]
}
```

**Response: 207 Multi-Status** (partial success)
```json
{
  "updated": 2,
  "failed": 1,
  "results": [
    {
      "id": "show-id-1",
      "status": "success"
    },
    {
      "id": "show-id-2",
      "status": "success"
    },
    {
      "id": "show-id-3",
      "status": "error",
      "error": "Show not found or access denied"
    }
  ]
}
```

**SQL Implementation:**
```sql
-- Use transaction for atomicity
START TRANSACTION;

UPDATE shows
SET
  status = COALESCE(@status, status),
  tourId = COALESCE(@tourId, tourId),
  updatedAt = CURRENT_TIMESTAMP
WHERE id IN (@showIds)
  AND entityId = @userEntityId;

COMMIT;
```

---

## 🎸 TOURS MANAGEMENT API

**Status:** Not in OpenAPI spec - Needs implementation

### Overview
Tours are collections of shows grouped together. Artists use tours to organize their show schedules. **Note:** Tours are ARTIST-ONLY feature (promoters don't create tours).

### Data Model

**Tour Entity:**
```typescript
interface Tour {
  // Core fields
  id: string;                    // UUID
  entityId: string;              // UUID - Must be artist entity
  createdBy: string;             // UUID - User who created

  // Tour details
  name: string;                  // Tour name (e.g., "Spring Tour 2026")
  startDate?: string;            // ISO 8601 - Auto-calculated from shows
  endDate?: string;              // ISO 8601 - Auto-calculated from shows

  // Status
  status: 'planning' | 'confirmed' | 'completed' | 'cancelled';

  // Statistics (calculated)
  showCount: number;             // Number of shows in tour
  confirmedShowCount: number;    // Number of confirmed shows

  // Additional info
  notes?: string;                // Tour notes

  // Metadata
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}
```

**Database Schema:**
```sql
CREATE TABLE tours (
  id VARCHAR(36) PRIMARY KEY,
  entityId VARCHAR(36) NOT NULL,
  createdBy VARCHAR(36) NOT NULL,

  name VARCHAR(255) NOT NULL,
  startDate DATETIME,
  endDate DATETIME,

  status VARCHAR(20) NOT NULL DEFAULT 'planning',
  CHECK (status IN ('planning', 'confirmed', 'completed', 'cancelled')),

  notes TEXT,

  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_entityId (entityId),
  INDEX idx_status (status),
  INDEX idx_dates (startDate, endDate),

  FOREIGN KEY (entityId) REFERENCES entities(id) ON DELETE CASCADE
);

-- Note: showCount is calculated, not stored
-- Query: SELECT COUNT(*) FROM shows WHERE tourId = ?
```

---

### API Endpoints

#### 1. GET /tours - List Tours

**Purpose:** Retrieve all tours for the current artist entity

**Endpoint:**
```
GET /tours
GET /tours?status={status}

Authorization: Bearer {token}
Ocp-Apim-Subscription-Key: {key}
```

**Authorization Check:**
```typescript
// MUST verify user has an artist entity (not promoter)
const entity = await getEntityForUser(userId);
if (entity.entityType !== 'artist') {
  return 403; // Promoters cannot access tours
}
```

**Query Parameters:**
- `status` (optional): Filter by status (planning, confirmed, completed, cancelled)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 50)

**Response: 200 OK**
```json
{
  "tours": [
    {
      "id": "tour-uuid",
      "entityId": "artist-entity-id",
      "createdBy": "user-id",
      "name": "Spring Tour 2026",
      "startDate": "2026-03-15T20:00:00Z",
      "endDate": "2026-04-30T23:00:00Z",
      "status": "planning",
      "showCount": 12,
      "confirmedShowCount": 8,
      "notes": "East coast tour",
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-28T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  }
}
```

**Response: 403 Forbidden** (if promoter tries to access)
```json
{
  "error": "Tours are only available for artist entities",
  "code": "FORBIDDEN",
  "entityType": "promoter"
}
```

**SQL Query:**
```sql
-- Get tours with calculated statistics
SELECT
  t.id,
  t.entityId,
  t.createdBy,
  t.name,
  t.status,
  t.notes,
  t.createdAt,
  t.updatedAt,
  -- Calculate date range from shows
  MIN(s.date) as startDate,
  MAX(s.date) as endDate,
  -- Calculate show counts
  COUNT(s.id) as showCount,
  SUM(CASE WHEN s.status = 'confirmed' THEN 1 ELSE 0 END) as confirmedShowCount
FROM tours t
LEFT JOIN shows s ON s.tourId = t.id AND s.deletedAt IS NULL
WHERE t.entityId = @artistEntityId
  AND (@status IS NULL OR t.status = @status)
GROUP BY t.id
ORDER BY t.startDate DESC, t.createdAt DESC
LIMIT @limit OFFSET @offset;
```

---

#### 2. POST /tours - Create Tour

**Purpose:** Create a new tour (artist-only)

**Endpoint:**
```
POST /tours
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Spring Tour 2026",
  "status": "planning",
  "notes": "East coast tour"
}
```

**Validation Rules:**
- ✅ `name` is required (max 255 chars)
- ✅ `status` must be one of: planning, confirmed, completed, cancelled (default: planning)
- ✅ User must have artist entity (promoters get 403)

**Response: 201 Created**
```json
{
  "id": "tour-uuid",
  "entityId": "artist-entity-id",
  "createdBy": "user-id",
  "name": "Spring Tour 2026",
  "startDate": null,
  "endDate": null,
  "status": "planning",
  "showCount": 0,
  "confirmedShowCount": 0,
  "notes": "East coast tour",
  "createdAt": "2026-01-28T10:00:00Z",
  "updatedAt": "2026-01-28T10:00:00Z"
}
```

**Response: 403 Forbidden** (if promoter)
```json
{
  "error": "Tours are only available for artist entities",
  "code": "FORBIDDEN",
  "entityType": "promoter"
}
```

**Response: 400 Bad Request**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "name",
      "message": "Tour name is required"
    }
  ]
}
```

---

#### 3. GET /tours/{id} - Get Tour Details

**Purpose:** Retrieve a specific tour with all its shows

**Endpoint:**
```
GET /tours/{id}
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "id": "tour-uuid",
  "entityId": "artist-entity-id",
  "createdBy": "user-id",
  "name": "Spring Tour 2026",
  "startDate": "2026-03-15T20:00:00Z",
  "endDate": "2026-04-30T23:00:00Z",
  "status": "planning",
  "showCount": 3,
  "confirmedShowCount": 2,
  "notes": "East coast tour",
  "createdAt": "2026-01-15T10:00:00Z",
  "updatedAt": "2026-01-28T14:30:00Z",
  "shows": [
    {
      "id": "show-uuid-1",
      "date": "2026-03-15T20:00:00Z",
      "venue": "The Bowery Ballroom",
      "city": "New York",
      "state": "New York",
      "country": "United States",
      "status": "confirmed",
      "fee": 1500.00,
      ...full show object...
    },
    {
      "id": "show-uuid-2",
      "date": "2026-03-20T21:00:00Z",
      "venue": "9:30 Club",
      "city": "Washington",
      "state": "DC",
      "country": "United States",
      "status": "confirmed",
      "fee": 1800.00,
      ...full show object...
    }
  ]
}
```

**Response: 404 Not Found**
```json
{
  "error": "Tour not found",
  "code": "TOUR_NOT_FOUND",
  "tourId": "invalid-id"
}
```

**Response: 403 Forbidden**
```json
{
  "error": "Access denied",
  "code": "FORBIDDEN"
}
```

**SQL Query:**
```sql
-- Get tour with shows
SELECT
  t.*,
  MIN(s.date) as startDate,
  MAX(s.date) as endDate,
  COUNT(s.id) as showCount,
  SUM(CASE WHEN s.status = 'confirmed' THEN 1 ELSE 0 END) as confirmedShowCount
FROM tours t
LEFT JOIN shows s ON s.tourId = t.id AND s.deletedAt IS NULL
WHERE t.id = @tourId
  AND t.entityId = @artistEntityId
GROUP BY t.id;

-- Get shows for tour
SELECT * FROM shows
WHERE tourId = @tourId
  AND deletedAt IS NULL
ORDER BY date ASC;
```

---

#### 4. PATCH /tours/{id} - Update Tour

**Purpose:** Update an existing tour

**Endpoint:**
```
PATCH /tours/{id}
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Tour Name",
  "status": "confirmed",
  "notes": "Updated notes"
}
```

**Response: 200 OK**
```json
{
  ...updated tour object with shows...
}
```

**Response: 404 Not Found**
```json
{
  "error": "Tour not found",
  "code": "TOUR_NOT_FOUND"
}
```

**Response: 403 Forbidden**
```json
{
  "error": "Access denied",
  "code": "FORBIDDEN"
}
```

**SQL Update:**
```sql
UPDATE tours
SET
  name = COALESCE(@name, name),
  status = COALESCE(@status, status),
  notes = COALESCE(@notes, notes),
  updatedAt = CURRENT_TIMESTAMP
WHERE id = @tourId
  AND entityId = @artistEntityId;
```

---

#### 5. DELETE /tours/{id} - Delete Tour

**Purpose:** Delete a tour (soft delete recommended)

**Endpoint:**
```
DELETE /tours/{id}
Authorization: Bearer {token}
```

**Behavior:**
- Deletes the tour
- Associated shows remain (tourId set to NULL)
- Shows do NOT get deleted

**Response: 204 No Content**
(Empty response body on success)

**Response: 404 Not Found**
```json
{
  "error": "Tour not found",
  "code": "TOUR_NOT_FOUND"
}
```

**Response: 403 Forbidden**
```json
{
  "error": "Access denied",
  "code": "FORBIDDEN"
}
```

**SQL Implementation:**
```sql
-- Option A: Soft delete (recommended)
UPDATE tours
SET
  deletedAt = CURRENT_TIMESTAMP,
  deletedBy = @userId
WHERE id = @tourId
  AND entityId = @artistEntityId;

-- Update shows to remove tour association
UPDATE shows
SET tourId = NULL, tourName = NULL
WHERE tourId = @tourId;

-- Option B: Hard delete
DELETE FROM tours
WHERE id = @tourId
  AND entityId = @artistEntityId;
-- (FK constraint will set shows.tourId to NULL if ON DELETE SET NULL)
```

---

## 📊 DATA MODELS & SCHEMAS

### Complete Entity Schema

Based on OpenAPI spec, here's the complete entity structure:

```typescript
interface Entity {
  // Identity
  id: string;                           // UUID
  administratorId: string;              // UUID - CRITICAL for ownership
  entityType: 'artist' | 'promoter';

  // Basic info
  name: string;
  alias: string;                        // URL-friendly name

  // Location
  city: string;
  state?: string;
  country: string;

  // Profile
  bio?: string;
  profileImageUrl?: string;
  headerImageUrl?: string;

  // Artists only
  genres?: string[];
  members?: Member[];

  // Social links
  socialLinks?: {
    spotify?: string;
    instagram?: string;
    facebook?: string;
    website?: string;
    twitter?: string;
    youtube?: string;
  };

  // Assets
  assets?: Asset[];

  // Access control
  users?: string[];                     // UUIDs of users with access
  administrators?: string[];            // UUIDs of admin users

  // Metadata
  createdAt: string;                    // ISO 8601
  updatedAt: string;                    // ISO 8601
}

interface Member {
  id: string;                           // UUID
  name: string;
  responsibility: string;               // e.g., "Vocals", "Guitar"
}

interface Asset {
  uri: string;                          // Full URL
  extension: string;                    // e.g., "jpg", "png"
  fileId: string;                       // Storage identifier
  mimeType: string;                     // e.g., "image/jpeg"
}
```

### Database Schema - Entities

```sql
CREATE TABLE entities (
  id VARCHAR(36) PRIMARY KEY,
  administratorId VARCHAR(36) NOT NULL,
  entityType VARCHAR(20) NOT NULL,
  CHECK (entityType IN ('artist', 'promoter')),

  name VARCHAR(255) NOT NULL,
  alias VARCHAR(255) UNIQUE,

  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),

  bio TEXT,
  profileImageUrl VARCHAR(500),
  headerImageUrl VARCHAR(500),

  genres JSON,  -- Array of strings
  socialLinks JSON,  -- Object with platform URLs

  users JSON,  -- Array of user IDs
  administrators JSON,  -- Array of admin user IDs

  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deletedAt DATETIME,
  deletedBy VARCHAR(36),

  INDEX idx_administratorId (administratorId),
  INDEX idx_entityType (entityType),
  INDEX idx_alias (alias),
  INDEX idx_deletedAt (deletedAt),

  UNIQUE KEY unique_admin_entity (administratorId, deletedAt)
);

CREATE TABLE members (
  id VARCHAR(36) PRIMARY KEY,
  entityId VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  responsibility VARCHAR(255),

  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_entityId (entityId),
  FOREIGN KEY (entityId) REFERENCES entities(id) ON DELETE CASCADE
);

CREATE TABLE assets (
  id VARCHAR(36) PRIMARY KEY,
  entityId VARCHAR(36) NOT NULL,
  uri VARCHAR(500) NOT NULL,
  extension VARCHAR(10),
  fileId VARCHAR(255),
  mimeType VARCHAR(100),

  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_entityId (entityId),
  FOREIGN KEY (entityId) REFERENCES entities(id) ON DELETE CASCADE
);
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Authentication Flow

**1. User signs in via Azure B2C**
- Frontend redirects to Azure B2C login
- User authenticates (GitHub, Google, etc.)
- Azure B2C issues JWT token
- Frontend stores token

**2. Frontend sends requests with token**
```
Authorization: Bearer {jwt-token}
Ocp-Apim-Subscription-Key: {subscription-key}
```

**3. Backend validates token**
- Verify JWT signature
- Check expiration
- Extract user ID from token claims

### Authorization Rules

**Entity Ownership:**
```typescript
// Every request must verify entity ownership
async function authorizeRequest(userId: string, entityId: string) {
  const entity = await db.query(
    'SELECT administratorId FROM entities WHERE id = ?',
    [entityId]
  );

  if (!entity || entity.administratorId !== userId) {
    throw new ForbiddenError('Access denied');
  }

  return entity;
}
```

**Resource-Specific Rules:**

| Resource | Create | Read | Update | Delete |
|----------|--------|------|--------|--------|
| Artist/Promoter | Must not own entity | Must be admin | Must be admin | Must be admin |
| Shows | Must own entity | Must own entity | Must own entity | Must own entity |
| Tours | Must own artist entity | Must own artist entity | Must own artist entity | Must own artist entity |
| Contacts | Any authenticated | Own + connected entities | N/A | N/A |
| Messages | Any authenticated | Participant in conversation | N/A | N/A |

**Artist vs Promoter:**
```typescript
// Some features are artist-only
async function requireArtistEntity(userId: string) {
  const entity = await getEntityForUser(userId);

  if (entity.entityType !== 'artist') {
    throw new ForbiddenError('This feature is only available for artists');
  }

  return entity;
}

// Example: Tours are artist-only
app.get('/tours', async (req, res) => {
  const userId = extractUserIdFromToken(req.headers.authorization);
  const entity = await requireArtistEntity(userId);

  const tours = await getTours(entity.id);
  res.json(tours);
});
```

---

## ⚠️ ERROR HANDLING STANDARDS

### Standard Error Response Format

All error responses should follow this format:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "details": {
    ...additional context...
  }
}
```

### HTTP Status Codes

Use these status codes consistently:

| Status | When to Use | Example |
|--------|-------------|---------|
| 200 OK | Successful GET, PATCH | Resource retrieved/updated |
| 201 Created | Successful POST | Entity created |
| 204 No Content | Successful DELETE | Resource deleted |
| 400 Bad Request | Validation error | Missing required field |
| 401 Unauthorized | Missing/invalid token | No Authorization header |
| 403 Forbidden | Valid auth, no permission | Wrong entity type |
| 404 Not Found | Resource doesn't exist | Invalid ID |
| 409 Conflict | Resource conflict | Duplicate entity |
| 500 Internal Server Error | Unexpected error | Database down |

### Error Code Standards

```typescript
// Authentication errors
AUTH_REQUIRED          // No Authorization header
AUTH_INVALID_TOKEN     // Invalid JWT token
AUTH_EXPIRED_TOKEN     // Token expired

// Authorization errors
FORBIDDEN              // Generic access denied
WRONG_ENTITY_TYPE      // Feature not available for entity type
NOT_OWNER              // Don't own this resource

// Validation errors
VALIDATION_ERROR       // Generic validation failure
MISSING_FIELD          // Required field missing
INVALID_FORMAT         // Field format incorrect
INVALID_VALUE          // Value out of range/invalid

// Resource errors
NOT_FOUND              // Resource doesn't exist
DUPLICATE_ENTITY       // User already owns entity
TOUR_NOT_FOUND         // Specific tour not found
SHOW_NOT_FOUND         // Specific show not found

// Server errors
DATABASE_ERROR         // Database query failed
INTERNAL_ERROR         // Unexpected error
```

### Example Error Responses

**400 Bad Request - Validation Error:**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "date",
      "message": "Date is required and must be valid ISO 8601 format",
      "value": "invalid-date"
    },
    {
      "field": "venue",
      "message": "Venue name cannot exceed 255 characters",
      "value": "very long venue name..."
    }
  ]
}
```

**401 Unauthorized:**
```json
{
  "error": "Authentication required",
  "code": "AUTH_REQUIRED",
  "message": "Please provide a valid Authorization header with Bearer token"
}
```

**403 Forbidden - Wrong Entity Type:**
```json
{
  "error": "Tours are only available for artist entities",
  "code": "WRONG_ENTITY_TYPE",
  "userEntityType": "promoter",
  "requiredEntityType": "artist"
}
```

**404 Not Found:**
```json
{
  "error": "Show not found",
  "code": "SHOW_NOT_FOUND",
  "showId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**409 Conflict - Duplicate Entity:**
```json
{
  "error": "You already own an entity",
  "code": "DUPLICATE_ENTITY",
  "existingEntityId": "existing-uuid",
  "existingEntityType": "artist"
}
```

**500 Internal Server Error:**
```json
{
  "error": "An unexpected error occurred",
  "code": "INTERNAL_ERROR",
  "requestId": "req-12345",
  "message": "Please contact support if this persists"
}
```

---

## 🧪 TESTING REQUIREMENTS

### Unit Tests

Each endpoint should have unit tests covering:

✅ **Happy path** - Valid request returns expected response
✅ **Authentication** - Missing/invalid token returns 401
✅ **Authorization** - Wrong user/entity returns 403
✅ **Validation** - Invalid input returns 400 with details
✅ **Not found** - Invalid ID returns 404
✅ **Conflict** - Duplicate/conflict returns 409

**Example Test Suite for POST /artist/add:**
```typescript
describe('POST /artist/add', () => {
  it('creates artist successfully', async () => {
    const response = await request(app)
      .post('/artist/add')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        name: 'Test Band',
        city: 'Brooklyn',
        country: 'United States'
      });

    expect(response.status).toBe(200);
    expect(response.body.id).toBeDefined();
    expect(response.body.administratorId).toBe(userId);
    expect(response.body.entityType).toBe('artist');
  });

  it('returns 401 without token', async () => {
    const response = await request(app)
      .post('/artist/add')
      .send({ name: 'Test Band' });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTH_REQUIRED');
  });

  it('returns 409 if user already owns entity', async () => {
    // Create first entity
    await createArtist(userId, { name: 'First Band' });

    // Try to create second entity
    const response = await request(app)
      .post('/artist/add')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ name: 'Second Band' });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('DUPLICATE_ENTITY');
  });

  it('returns 400 if name missing', async () => {
    const response = await request(app)
      .post('/artist/add')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ city: 'Brooklyn' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.details[0].field).toBe('name');
  });
});
```

### Integration Tests

Test complete user flows:

✅ **Onboarding flow:**
1. Sign in
2. GET /user/entities (should return empty array)
3. POST /artist/add (should succeed)
4. GET /user/entities (should return new entity with administratorId)
5. POST /artist/add again (should fail with 409)

✅ **Show management flow:**
1. Create artist entity
2. POST /shows (create show)
3. GET /shows (list shows)
4. GET /shows/{id} (get details)
5. PATCH /shows/{id} (update show)
6. DELETE /shows/{id} (delete show)

✅ **Tour management flow:**
1. Create artist entity
2. POST /tours (create tour)
3. POST /shows with tourId (add show to tour)
4. GET /tours/{id} (verify show in tour)
5. PATCH /tours/{id} (update tour)
6. DELETE /tours/{id} (verify shows remain, tourId nulled)

### Performance Tests

✅ **Load tests:**
- 100 concurrent users creating shows
- 1000 shows retrieved in list endpoint
- Bulk update of 50 shows

✅ **Response time targets:**
- GET requests: < 200ms
- POST/PATCH requests: < 500ms
- Bulk operations: < 2s

### Security Tests

✅ **SQL injection** - Test with malicious input
✅ **XSS** - Test with script tags in text fields
✅ **CSRF** - Verify token validation
✅ **Rate limiting** - Test excessive requests
✅ **Authorization bypass** - Test accessing other users' data

---

## 📦 DEPLOYMENT CHECKLIST

### Pre-Deployment

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Code reviewed and approved
- [ ] OpenAPI spec updated
- [ ] Database migrations prepared
- [ ] Environment variables configured
- [ ] Logging and monitoring setup

### Database Migrations

```sql
-- Migration 1: Add administratorId to entities response
-- (No schema change needed, just query update)

-- Migration 2: Create shows table
-- (See shows database schema above)

-- Migration 3: Create tours table
-- (See tours database schema above)

-- Migration 4: Add soft delete columns (optional)
ALTER TABLE entities ADD COLUMN deletedAt DATETIME;
ALTER TABLE entities ADD COLUMN deletedBy VARCHAR(36);
ALTER TABLE shows ADD COLUMN deletedAt DATETIME;
ALTER TABLE shows ADD COLUMN deletedBy VARCHAR(36);
ALTER TABLE tours ADD COLUMN deletedAt DATETIME;
ALTER TABLE tours ADD COLUMN deletedBy VARCHAR(36);

-- Migration 5: Add indexes for performance
CREATE INDEX idx_shows_entityId ON shows(entityId);
CREATE INDEX idx_shows_date ON shows(date);
CREATE INDEX idx_shows_status ON shows(status);
CREATE INDEX idx_shows_tourId ON shows(tourId);
CREATE INDEX idx_tours_entityId ON tours(entityId);
```

### Deployment Steps

1. **Deploy database migrations** (test in staging first)
2. **Deploy backend code** to Azure Functions
3. **Update API Management** with new endpoints
4. **Update OpenAPI specs** in API Management
5. **Test critical paths** in production
6. **Monitor errors** for first hour
7. **Notify frontend team** when ready

### Post-Deployment Validation

```bash
# Test critical endpoints in production

# 1. Test GET /user/entities includes administratorId
curl -X GET \
  "https://scenegen-apim.azure-api.net/scenegen-api/user/entities" \
  -H "Authorization: Bearer {prod-token}" \
  -H "Ocp-Apim-Subscription-Key: {prod-key}" \
  | jq '.[0] | {id, administratorId, entityType}'

# 2. Test duplicate entity check
curl -X POST \
  "https://scenegen-apim.azure-api.net/scenegen-api/artist/add" \
  -H "Authorization: Bearer {prod-token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Band"}'
# Expected: 409 if already owns entity

# 3. Test shows endpoint exists
curl -X GET \
  "https://scenegen-apim.azure-api.net/scenegen-api/shows" \
  -H "Authorization: Bearer {prod-token}"
# Expected: 200 with array (or empty array)

# 4. Test tours endpoint exists
curl -X GET \
  "https://scenegen-apim.azure-api.net/scenegen-api/tours" \
  -H "Authorization: Bearer {prod-token}"
# Expected: 200 with array (or 403 if promoter)
```

### Rollback Plan

If critical issues found:

1. **Revert backend deployment** to previous version
2. **Keep database changes** (they're backwards compatible)
3. **Notify frontend team** to re-enable bypass if needed
4. **Fix issues** in development
5. **Re-deploy** when ready

---

## 📞 SUPPORT & QUESTIONS

### Frontend Contact
- GitHub Issues: [repo URL]
- Slack: #scenegen-dev

### Backend Team Responsibilities
- Implement all endpoints in this document
- Write unit and integration tests
- Update OpenAPI specifications
- Deploy to Azure Functions
- Monitor performance and errors

### Timeline

**Week 1 (Critical):**
- Fix GET /user/entities (include administratorId)
- Add duplicate entity check (409 response)
- Deploy and test

**Week 2 (High Priority):**
- Implement shows endpoints
- Implement tours endpoints
- Write tests
- Deploy and test

**Week 3 (Polish):**
- Add bulk operations
- Performance optimization
- Complete testing
- Final deployment

---

## ✅ ACCEPTANCE CRITERIA

### Feature Complete When:

**GET /user/entities:**
- ✅ Returns array of full entity objects
- ✅ Each object includes `administratorId` field
- ✅ Frontend can verify ownership without bypass

**Duplicate Entity Check:**
- ✅ POST /artist/add returns 409 if user owns entity
- ✅ POST /promoter/add returns 409 if user owns entity
- ✅ Error response includes existing entity details

**Shows API:**
- ✅ All 6 endpoints implemented (GET, POST, PATCH, DELETE, GET by ID, bulk update)
- ✅ Full CRUD operations work
- ✅ Authorization enforced (can only manage own shows)
- ✅ Tests passing

**Tours API:**
- ✅ All 5 endpoints implemented (GET, POST, PATCH, DELETE, GET by ID)
- ✅ Artist-only restriction enforced
- ✅ Tour-show associations work
- ✅ Calculated fields (showCount, dates) accurate
- ✅ Tests passing

---

**End of Backend Requirements Document**

Questions? Contact the frontend team or refer to:
- `API_AUDIT.md` - Detailed analysis
- `TESTING_CHECKLIST.md` - Testing guide
- `NEXT_STEPS.md` - Coordination plan
