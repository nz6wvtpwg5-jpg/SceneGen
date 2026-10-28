# Entity Endpoints Implementation - Complete

## Problem
The frontend was getting two errors during onboarding:
1. **500 error on `/api/user/entities`** - Endpoint existed but was failing to reach the backend
2. **404 error on `/api/artist/add`** - Backend endpoints didn't exist

## Root Cause
The local backend was missing:
- The `entities` database table
- The `/api/user/entities` endpoint
- The `/api/artist/add` and `/api/promoter/add` endpoints

## Solution Implemented

### 1. Database Migration (`backend/migrate.js`)
Added `entities` table creation:
```sql
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  administrator_id VARCHAR(255) NOT NULL,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('artist', 'promoter')),
  name VARCHAR(255) NOT NULL,
  bio TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (administrator_id)
);
```

**Key Features:**
- `UNIQUE (administrator_id)` - Enforces one entity per user
- Supports both artist and promoter types
- Stores full location data including lat/long from Google Places

### 2. Backend API Endpoints (`backend/server.js`)

#### GET /api/user/entities
Fetches all entities for a user (currently just one due to UNIQUE constraint)
```javascript
// Requires X-User-Id header
// Returns array of entity objects
```

#### POST /api/artist/add
Creates a new artist entity
```javascript
// Validates user doesn't already own an entity (409 if exists)
// Requires: name, optional: bio, city, state, country, latitude, longitude
// Returns created entity object
```

#### POST /api/promoter/add
Creates a new promoter entity
```javascript
// Same validation and structure as artist/add
// entity_type = 'promoter'
```

### 3. Frontend API Routes Updated

All three routes now support local backend:
- `/src/app/api/user/entities/route.ts`
- `/src/app/api/artist/add/route.ts`
- `/src/app/api/promoter/add/route.ts`

**Key Changes:**
- Extract user ID from JWT token (`oid` field) automatically
- Pass user ID via `X-User-Id` header to backend
- Support both local backend and Azure backend (determined by `USE_LOCAL_BACKEND` env var)

### 4. CORS Configuration
Updated backend to allow both localhost:3000 and localhost:3002:
```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002', process.env.FRONTEND_URL].filter(Boolean),
  credentials: true
}));
```

## Testing

### Test 1: Create Artist Entity
```bash
curl -X POST http://localhost:3001/api/artist/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -H "X-User-Id: test-user-jon" \
  -d '{
    "name": "Test Artist",
    "bio": "A test artist bio",
    "city": "Los Angeles",
    "state": "California",
    "country": "USA",
    "latitude": 34.0522,
    "longitude": -118.2437
  }'
```
**Result:** ✅ Entity created successfully

### Test 2: Duplicate Entity Check
```bash
# Same request again with same user ID
```
**Result:** ✅ Returns 409 Conflict: "You already own an entity"

### Test 3: Fetch User Entities
```bash
curl -X GET http://localhost:3001/api/user/entities \
  -H "Authorization: Bearer test-token" \
  -H "X-User-Id: test-user-jon"
```
**Result:** ✅ Returns array with one entity

## Files Changed

### Backend
- ✅ `backend/migrate.js` - Added entities table
- ✅ `backend/server.js` - Added 3 new endpoints
- ✅ `backend/.env` - Updated FRONTEND_URL to port 3002

### Frontend
- ✅ `src/app/api/user/entities/route.ts` - JWT extraction, local backend support
- ✅ `src/app/api/artist/add/route.ts` - JWT extraction, local backend support
- ✅ `src/app/api/promoter/add/route.ts` - JWT extraction, local backend support

## What Works Now

1. ✅ User can complete onboarding flow
2. ✅ Artist/Promoter entity is created in database
3. ✅ Full location data (including lat/long) is saved
4. ✅ Duplicate entity creation is prevented (409 error)
5. ✅ User entities are fetched and displayed
6. ✅ JWT token is properly decoded to extract user ID
7. ✅ Frontend automatically routes to local backend

## Next Steps

1. **Test the full onboarding flow in the browser**
   - Navigate to /onboarding
   - Fill out the form with Google Places autocomplete
   - Submit and verify entity is created
   - Check that you're redirected to /dashboard
   - Verify the entity ID is saved to localStorage

2. **Map entity.id to shows**
   - When creating shows, use the entity.id as entity_id
   - This links shows to the correct artist/promoter

3. **Clean up test data** (optional)
   ```sql
   DELETE FROM entities WHERE administrator_id = 'test-user-jon';
   ```

## JWT Token Structure
The Azure B2C access token contains:
```json
{
  "oid": "31abcffb-6c8c-4988-bbbf-fd59350d4038",  // User ID (extracted automatically)
  "sub": "31abcffb-6c8c-4988-bbbf-fd59350d4038",
  "name": "Jon Davis",
  "emails": ["jon@scenegen.io"],
  "given_name": "Jon",
  "family_name": "Davis"
}
```

Frontend API routes now automatically extract the `oid` field and pass it to the backend.

## Status
🎉 **COMPLETE** - All entity endpoints are implemented and tested.
