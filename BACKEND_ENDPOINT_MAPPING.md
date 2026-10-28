# Local Backend ↔ Azure Backend: Endpoint Mapping

## Quick Reference

| Local Backend | Azure Backend | Status | Notes |
|---------------|---------------|--------|-------|
| `GET /api/user/entities` | `GET /user/entities` | ✅ Exists | Minor response format differences |
| `POST /api/artist/add` | `POST /artist/add` | ✅ Exists | Request body needs alignment |
| `POST /api/promoter/add` | `POST /promoter/add` | ✅ Exists | Request body needs alignment |

---

## Detailed Comparison

### 1. GET /user/entities

#### Azure Backend (Production)
```http
GET https://scenegen-apim.azure-api.net/scenegen-api/user/entities
Authorization: Bearer {jwt-token}

Response 200:
[
  {
    "name": "Electric Horizon",
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "entityType": "artist"
  },
  {
    "name": "Riot Heart Promotions",
    "id": "987fcdeb-51d3-12d3-a456-426614174001",
    "entityType": "promoter"
  }
]
```

#### Local Backend (Current)
```http
GET http://localhost:3001/api/user/entities
Authorization: Bearer {jwt-token}
X-User-Id: {user-id}  ← Will be removed (extracting from JWT instead)

Response 200:
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Electric Horizon",
    "entity_type": "artist",  ← Should be "entityType"
    "created_at": "2024-01-15T10:30:00Z"  ← Should be "createdAt" (optional field, OK to keep)
  }
]
```

#### Changes Needed
- ❌ Remove `X-User-Id` header dependency → extract from JWT
- ❌ Change `entity_type` → `entityType` in response
- ⚠️ Change `created_at` → `createdAt` (optional, but good for consistency)

---

### 2. POST /artist/add

#### Azure Backend (Production)
```http
POST https://scenegen-apim.azure-api.net/scenegen-api/artist/add
Authorization: Bearer {jwt-token}
Content-Type: application/json

Request Body:
{
  "name": "Electric Horizon",
  "country": "United States",
  "city": "Brooklyn",
  "state": "New York",
  "bio": "Introducing 'Electric Horizon', a four-piece indie rock band..."
}

Response 200:
{
  "administratorId": "user-123",
  "users": ["user-123"],
  "administrators": ["user-123"],
  "members": [],
  "assets": [],
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Electric Horizon",
  "alias": "electric-horizon",
  "country": "United States",
  "city": "Brooklyn",
  "state": "New York",
  "bio": "Introducing 'Electric Horizon'..."
}
```

#### Local Backend (Current)
```http
POST http://localhost:3001/api/artist/add
Authorization: Bearer {jwt-token}
X-User-Id: {user-id}  ← Will be removed
Content-Type: application/json

Request Body:
{
  "name": "Electric Horizon",
  "location": {  ← Nested object (from Google Places)
    "city": "Brooklyn",
    "state": "New York",
    "country": "United States",
    "latitude": 40.6782,
    "longitude": -73.9442,
    "placeId": "ChIJOwg_06VPwokRYv534QaPC8g"
  },
  "bio": "Introducing 'Electric Horizon'..."
}

Response 201:
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Electric Horizon",
  "entity_type": "artist",  ← Should be "entityType"
  "location": { ... },
  "created_at": "2024-01-15T10:30:00Z"  ← Should be "createdAt"
}
```

#### Changes Needed
- ❌ Remove `X-User-Id` header dependency
- ❌ **Request body**: Accept BOTH formats (nested + flat) OR transform frontend to send flat
- ❌ **Response**: Add missing fields:
  - `alias` (auto-generated from name)
  - `country`, `city`, `state` (flat fields for compatibility)
  - `administratorId` (set to user ID)
  - `users`, `administrators` (initially just the creator)
  - `members`, `assets` (empty arrays initially)
- ❌ Change `entity_type` → `entityType`

---

### 3. POST /promoter/add

#### Azure Backend (Production)
```http
POST https://scenegen-apim.azure-api.net/scenegen-api/promoter/add
Authorization: Bearer {jwt-token}
Content-Type: application/json

Request Body:
{
  "name": "Riot Heart Promotions",
  "country": "United States",
  "bio": "Introducing 'Riot Heart Promotions'...",
  "city": "Los Angeles",
  "state": "California"
}

Response 200:
{
  "administratorId": "user-123",
  "users": ["user-123"],
  "administrators": ["user-123"],
  "id": "987fcdeb-51d3-12d3-a456-426614174001",
  "name": "Riot Heart Promotions",
  "alias": "riot-heart-promotions",
  "country": "United States",
  "city": "Los Angeles",
  "state": "California",
  "bio": "Introducing 'Riot Heart Promotions'..."
}
```

#### Local Backend (Current)
```http
POST http://localhost:3001/api/promoter/add
Authorization: Bearer {jwt-token}
X-User-Id: {user-id}
Content-Type: application/json

Request Body:
{
  "name": "Riot Heart Promotions",
  "location": {  ← Same nested structure as artist
    "city": "Los Angeles",
    "state": "California",
    "country": "United States",
    "latitude": 34.0522,
    "longitude": -118.2437,
    "placeId": "ChIJE9on3F3HwoAR9AhGJW_fL-I"
  },
  "bio": "Introducing 'Riot Heart Promotions'..."
}

Response 201:
{
  "id": "987fcdeb-51d3-12d3-a456-426614174001",
  "name": "Riot Heart Promotions",
  "entity_type": "promoter",
  "location": { ... },
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### Changes Needed
- Same as `/artist/add` above

---

## Authentication Flow Comparison

### Azure Backend
```
1. User logs in → Frontend gets JWT from Azure AD / Auth0 / etc.
2. Frontend stores JWT (httpOnly cookie or localStorage)
3. Frontend makes request with: Authorization: Bearer {jwt}
4. Azure API Gateway validates JWT
5. Azure extracts user ID from JWT claims (e.g., 'sub' or 'oid')
6. Azure passes user ID to function handler internally
7. Function handler uses user ID for database queries
```

### Local Backend (Current)
```
1. User logs in → Frontend gets JWT from NextAuth
2. Frontend stores JWT in session
3. Frontend extracts user ID from JWT manually (bad!)
4. Frontend makes request with:
   - Authorization: Bearer {jwt}
   - X-User-Id: {extracted-user-id}  ← Security issue!
5. Backend trusts X-User-Id header (no validation)
6. Backend uses X-User-Id for database queries
```

### Local Backend (After Fix)
```
1. User logs in → Frontend gets JWT from NextAuth
2. Frontend stores JWT in session
3. Frontend makes request with ONLY: Authorization: Bearer {jwt}
4. Backend middleware validates JWT signature
5. Backend extracts user ID from JWT claims internally
6. Backend uses validated user ID for database queries
```

---

## Database Schema Comparison

### Azure Backend (Inferred)

Likely has separate tables (normalized):

```sql
-- Artists table
CREATE TABLE artists (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  alias VARCHAR(255) UNIQUE,
  country VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(100),
  bio TEXT,
  administrator_id UUID,  -- User who created/owns this entity
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Artist members (many-to-many)
CREATE TABLE artist_members (
  id UUID PRIMARY KEY,
  artist_id UUID REFERENCES artists(id),
  name VARCHAR(255),
  instrument VARCHAR(100),
  role VARCHAR(100)
);

-- Entity users (many-to-many for permissions)
CREATE TABLE entity_users (
  entity_id UUID,
  user_id UUID,
  role VARCHAR(50),  -- 'viewer', 'editor', etc.
  PRIMARY KEY (entity_id, user_id)
);

-- Entity administrators
CREATE TABLE entity_administrators (
  entity_id UUID,
  user_id UUID,
  PRIMARY KEY (entity_id, user_id)
);

-- Promoters (similar structure, no members)
CREATE TABLE promoters (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  alias VARCHAR(255) UNIQUE,
  country VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(100),
  bio TEXT,
  administrator_id UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Assets (shared by both artists and promoters)
CREATE TABLE entity_assets (
  id UUID PRIMARY KEY,
  entity_id UUID,
  file_id UUID,
  asset_type VARCHAR(50),
  url TEXT,
  created_at TIMESTAMP
);
```

### Local Backend (Current)

Single denormalized table:

```sql
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,  -- Maps to Azure's administrator_id
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('artist', 'promoter')),
  name VARCHAR(255) NOT NULL,
  location JSONB,  -- Contains city, state, country, lat/lng, placeId
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name, entity_type)
);
```

### Migration Path

**Option 1: Keep Denormalized (Simpler for MVP)**
- Add `alias` column to entities table
- Add `country`, `city`, `state` columns (extract from location JSONB)
- Keep `location` JSONB for rich Google Places data
- Create junction tables later when needed (entity_users, entity_administrators, etc.)

**Option 2: Normalize Now (Matches Azure)**
- Create separate `artists` and `promoters` tables
- Create junction tables for users, administrators, members, assets
- More complex but matches Azure architecture exactly

**Recommendation**: Option 1 for local development, Option 2 for Azure implementation

---

## Error Response Comparison

### Azure Backend
```json
// 400 Bad Request
{
  // Unknown - not documented in OpenAPI spec
}

// 401 Unauthorized
{
  // Unknown - not documented in OpenAPI spec
}

// 404 Not Found
{
  // Unknown - not documented in OpenAPI spec
}
```

### Local Backend (Current)
```json
// 400 Bad Request
{
  "error": "Missing required fields: name, location"
}

// 401 Unauthorized
{
  "error": "No authorization token provided"
}

// 409 Conflict (duplicate entity)
{
  "error": "An artist with this name already exists"
}

// 500 Internal Server Error
{
  "error": "Failed to create artist",
  "details": "Database error message"
}
```

### Recommendation
**Ask Azure backend team for standard error format**, then align local backend to match.

Suggested standard format:
```json
{
  "error": {
    "code": "MISSING_REQUIRED_FIELDS",
    "message": "Missing required fields: name, location",
    "details": {
      "missingFields": ["name", "location"]
    }
  }
}
```

---

## Frontend Integration

### Current Frontend Code
```typescript
// src/app/api/artist/add/route.ts
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const session = await getServerSession(authOptions);
const userId = session?.user?.id;

const response = await fetch(`${apiUrl}/api/artist/add`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-User-Id': userId,  ← Remove this after backend JWT verification
  },
  body: JSON.stringify(requestBody),
});
```

### After Alignment
```typescript
// Works with BOTH local and Azure backends!
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const basePath = apiUrl.includes('azure-api.net') ? '' : '/api';

const response = await fetch(`${apiUrl}${basePath}/artist/add`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    // No X-User-Id header - extracted from JWT on backend
  },
  body: JSON.stringify({
    name: data.name,
    country: data.location.country,
    city: data.location.city,
    state: data.location.state,
    bio: data.bio,
    // Azure backend expects flat fields above
    // Can also include location object for local backend richness
  }),
});
```

---

## Migration Checklist

### For Backend Developer

When implementing these endpoints in Azure Functions:

1. **Authentication**
   - [ ] Use existing Azure AD / Auth0 JWT validation
   - [ ] Extract user ID from `sub` or `oid` claim
   - [ ] Return 401 if token invalid/missing

2. **Request Validation**
   - [ ] Validate required fields: `name`, `country`, `city` (state optional)
   - [ ] Return 400 with descriptive error if validation fails

3. **Business Logic**
   - [ ] Check for duplicate entities (same name + user)
   - [ ] Generate alias from name (lowercase, hyphenated)
   - [ ] Set `administratorId` to authenticated user ID
   - [ ] Add user to `users` and `administrators` arrays/tables

4. **Response Format**
   - [ ] Return full entity DTO with all fields
   - [ ] Use camelCase for field names
   - [ ] Include relationships (users, administrators, members, assets)

5. **Database**
   - [ ] Insert into appropriate table (artists or promoters)
   - [ ] Create entries in junction tables (entity_users, entity_administrators)
   - [ ] Use transactions for data consistency

6. **Testing**
   - [ ] Unit tests for validation logic
   - [ ] Integration tests for database operations
   - [ ] End-to-end tests with frontend

---

## Summary

**Status**: ✅ The local backend mirrors the Azure backend's endpoint structure

**Alignment Tasks**:
1. Update response format (camelCase, add missing fields)
2. Add JWT verification (remove X-User-Id header)
3. Support flat location fields in request/response
4. Add alias generation
5. Add database schema enhancements (alias column, junction tables)

**Estimated Effort**:
- Local backend updates: 3-4 hours
- Azure backend implementation: 8-12 hours (estimated)

**Risk Level**: Low - No architectural conflicts

**Next Steps**:
1. Apply quick fixes to local backend (see QUICK_FIX_CHECKLIST.md)
2. Test thoroughly with frontend
3. Backend team implements in Azure Functions
4. Frontend switches to Azure via env variable
5. Decommission local backend (or keep for development)

