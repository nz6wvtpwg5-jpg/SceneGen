# Backend Alignment Analysis: Local vs Azure API

## Executive Summary

**GOOD NEWS**: The new endpoints created in the local backend (`/api/user/entities`, `/api/artist/add`, `/api/promoter/add`) **already exist** in the Azure backend's OpenAPI specification. This means the local backend implementation is aligned with the existing Azure backend design.

**Status**: ✅ **No Conflicts** - The local backend mirrors existing Azure endpoints
**Action Required**: Minor alignment adjustments detailed below

---

## Endpoint Comparison

### 1. `/user/entities` (GET)

#### Azure Backend (Existing)
- **Path**: `/user/entities`
- **Method**: GET
- **Auth**: Bearer token (JWT)
- **Response**: Array of `entitiesMenuViewModel`
  ```json
  {
    "name": "string",
    "id": "uuid",
    "entityType": "string"  // "artist" or "promoter"
  }
  ```

#### Local Backend (Current Implementation)
- **Path**: `/api/user/entities`
- **Method**: GET
- **Auth**: JWT extracted from Authorization header, user ID passed via X-User-Id
- **Response**: Array with similar structure
  ```json
  {
    "id": "uuid",
    "name": "string",
    "entity_type": "string",
    "created_at": "timestamp"
  }
  ```

#### Alignment Actions Required
- ✅ **Endpoint exists** in Azure spec
- ⚠️ **Field naming**: Change `entity_type` → `entityType` (camelCase)
- ✅ **Additional fields** (`created_at`) are fine for local DB, won't break frontend
- 🔄 **Auth extraction**: Local backend extracts user ID from JWT (Azure likely does this server-side too)

---

### 2. `/artist/add` (POST)

#### Azure Backend (Existing)
- **Path**: `/artist/add`
- **Method**: POST
- **Auth**: Bearer token (JWT)
- **Request Body**: `addArtistRequestModel`
  ```json
  {
    "name": "string",
    "country": "string",
    "city": "string",
    "state": "string",
    "bio": "string"
  }
  ```
- **Response**: `artistEntityDto` (includes id, alias, administratorId, etc.)

#### Local Backend (Current Implementation)
- **Path**: `/api/artist/add`
- **Method**: POST
- **Auth**: JWT → user ID via X-User-Id header
- **Request Body**:
  ```json
  {
    "name": "string",
    "location": {
      "city": "string",
      "state": "string",
      "country": "string",
      "latitude": number,
      "longitude": number,
      "placeId": "string"
    },
    "bio": "string"
  }
  ```
- **Response**:
  ```json
  {
    "id": "uuid",
    "name": "string",
    "entity_type": "artist",
    "location": {...},
    "created_at": "timestamp"
  }
  ```

#### Alignment Actions Required
- ✅ **Endpoint exists** in Azure spec
- ⚠️ **Request schema difference**:
  - Azure expects flat `city`, `state`, `country` fields
  - Local uses nested `location` object with Google Places data
  - **DECISION NEEDED**: Frontend currently sends nested location. Options:
    1. Update frontend to send flat fields (matches Azure)
    2. Update local backend to accept both formats (transformation layer)
    3. Propose Azure backend enhancement to accept location object
- ⚠️ **Response schema**: Azure returns full `artistEntityDto` with more fields
  - Local backend should return at minimum: `id`, `name`, `alias`, `country`, `city`, `state`, `bio`

---

### 3. `/promoter/add` (POST)

#### Azure Backend (Existing)
- **Path**: `/promoter/add`
- **Method**: POST
- **Auth**: Bearer token (JWT)
- **Request Body**: `addPromoterRequestModel`
  ```json
  {
    "name": "string",
    "country": "string",
    "city": "string",
    "state": "string",
    "bio": "string"
  }
  ```
- **Response**: `promoterEntityDto`

#### Local Backend (Current Implementation)
- **Path**: `/api/promoter/add`
- **Method**: POST
- **Auth**: JWT → user ID via X-User-Id header
- **Request Body**: Same nested `location` structure as artist
- **Response**: Similar to artist response

#### Alignment Actions Required
- ✅ **Endpoint exists** in Azure spec
- ⚠️ **Same issues as `/artist/add`**: Request/response schema alignment needed

---

## Authentication & Authorization

### Current Approach (Local Backend)
1. Frontend extracts user ID from JWT session
2. Passes user ID via custom `X-User-Id` header
3. Backend trusts this header and uses it for database operations

### Azure Backend Approach (Inferred from OpenAPI)
- Uses `bearer_auth` security scheme
- Likely validates JWT server-side and extracts user ID internally
- No custom headers needed (standard OAuth2/JWT flow)

### Recommendation
**For Local Backend**:
- ✅ Current approach works for local development
- ⚠️ Add JWT verification in backend (don't just trust header)
- 🔄 When migrating to Azure, frontend can remove X-User-Id header logic

**Code Change Needed**:
```javascript
// backend/server.js - Add JWT verification middleware
const jwt = require('jsonwebtoken');

function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.sub || decoded.userId; // Extract from JWT directly
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Use in routes:
app.get('/api/user/entities', authenticateUser, async (req, res) => {
  const userId = req.userId; // From JWT, not header
  // ...
});
```

---

## Database Schema Alignment

### Azure Backend (Inferred from OpenAPI responses)

#### Artists
- `id` (uuid)
- `name` (string)
- `alias` (string) - **Missing in local DB**
- `country` (string)
- `city` (string)
- `state` (string)
- `bio` (string)
- `administratorId` (string) - Likely the user who created it
- `users` (array) - List of user IDs with access
- `administrators` (array) - List of admin user IDs
- `members` (array of `artistMemberDto`)
- `assets` (array of `assetEntityDto`)

#### Promoters
- Similar structure to Artists
- No `members` field

### Local Backend (Current Schema)

#### entities table
```sql
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  location JSONB,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Schema Gap Analysis

| Field | Azure | Local | Action |
|-------|-------|-------|--------|
| `id` | ✅ | ✅ | OK |
| `name` | ✅ | ✅ | OK |
| `alias` | ✅ | ❌ | **ADD** to local DB |
| `country/city/state` | ✅ (flat) | ⚠️ (in JSONB) | Extract to columns or keep in JSONB |
| `bio` | ✅ | ✅ | OK |
| `administratorId` | ✅ | ⚠️ (`user_id`) | Rename or map |
| `users` | ✅ | ❌ | Need entity_users junction table |
| `administrators` | ✅ | ❌ | Need entity_admins junction table |
| `members` | ✅ (artists) | ❌ | Need artist_members table |
| `assets` | ✅ | ❌ | Need entity_assets table |

---

## Recommended Migration Plan

### Phase 1: Immediate Alignment (This Week)
1. **Update local backend response schemas** to match Azure `entityType` (camelCase)
2. **Add `alias` field** to entities table
3. **Flatten location data** in request/response OR update frontend to send flat fields
4. **Add JWT verification** to backend (don't rely on X-User-Id header)

### Phase 2: Schema Enhancement (Next Week)
5. **Add related tables**: entity_users, entity_administrators, artist_members, entity_assets
6. **Update API responses** to include these relationships
7. **Add migration script** to transform existing data

### Phase 3: Azure Backend Implementation (Backend Team)
8. Backend team implements these endpoints in Azure Functions
9. Uses same request/response schemas
10. Frontend switches `NEXT_PUBLIC_API_URL` to Azure endpoint
11. Remove X-User-Id header logic from frontend (Azure handles auth internally)

---

## Frontend Compatibility

### Current Frontend Code
The frontend is already structured to work with both backends:

```typescript
// src/app/api/artist/add/route.ts
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const response = await fetch(`${apiUrl}/api/artist/add`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-User-Id': userId, // Only needed for local backend
  },
  body: JSON.stringify(requestBody),
});
```

### Transition Plan
1. **Local Development**: `NEXT_PUBLIC_API_URL=http://localhost:3001`
2. **Azure Staging**: `NEXT_PUBLIC_API_URL=https://scenegen-apim.azure-api.net/scenegen-api`
3. Frontend code adapts automatically based on env variable
4. Remove `X-User-Id` header logic when Azure backend is ready

---

## Questions for Backend Team

### Data Structure
1. **Location storage**: Should we store location as flat fields (city, state, country) or as a nested object with Google Places data (placeId, lat/lng)?
   - Azure spec shows flat fields
   - Frontend currently uses Google Places autocomplete (returns nested object)
   - **Recommendation**: Store both - flat fields for compatibility + JSONB for rich data

2. **Alias generation**: How should `alias` be generated? (e.g., slugified name, random string?)
   - Example from Azure spec: Artist "Electric Horizon" → alias ???
   - **Recommendation**: Use slugified name with uniqueness check

3. **Relationships**: When creating an artist/promoter, should we:
   - Automatically add creator as administrator? (Yes, based on `administratorId` in Azure response)
   - Create initial entry in entity_users and entity_administrators tables? (Yes)

### Authentication
4. **JWT validation**: What library/method does Azure backend use for JWT validation?
   - Need to align local backend for consistency

5. **User ID extraction**: What claim in the JWT contains the user ID? (`sub`, `userId`, `oid`?)
   - Need to know for JWT verification

### Error Handling
6. **Error response format**: What's the standard error response structure?
   - Azure spec shows 400/401/404 but no response schema
   - **Recommendation**: Use format like:
     ```json
     {
       "error": "Error message",
       "code": "ERROR_CODE",
       "details": {}
     }
     ```

### Business Rules
7. **Duplicate prevention**: Should users be able to create multiple entities with the same name?
   - Local backend currently prevents duplicates (409 Conflict)
   - Is this the desired behavior for Azure too?

8. **Entity limits**: Are there any limits on number of entities per user?

---

## Files That Need Updates

### Local Backend
- ✅ `/backend/server.js` - Add JWT verification, update response schemas
- ✅ `/backend/migrate.js` - Add alias column, create junction tables
- 📄 `/backend/.env` - Add JWT_SECRET

### Frontend API Routes
- ⚠️ `/src/app/api/artist/add/route.ts` - Update request body format (flatten location OR keep nested)
- ⚠️ `/src/app/api/promoter/add/route.ts` - Same as artist
- ⚠️ `/src/app/api/user/entities/route.ts` - Update to expect `entityType` instead of `entity_type`

### Frontend Components
- ⚠️ `/src/app/onboarding/page.tsx` - Adjust form data structure based on decision
- ⚠️ `/src/lib/entity.ts` - Update type definitions to match Azure schemas

---

## Conclusion

**The local backend is well-aligned with the Azure backend architecture.** The endpoints exist in the Azure OpenAPI spec, and the core functionality matches. The main alignment tasks are:

1. **Response schema formatting** (camelCase field names)
2. **Request body structure** (flatten location data OR enhance Azure to accept nested)
3. **JWT verification** (replace header-based auth with proper JWT validation)
4. **Database schema** (add missing fields and relationships)

**Estimated Effort**: 4-6 hours for Phase 1 alignment tasks

**Risk Level**: Low - No architectural conflicts, only schema/format alignment needed

---

## Next Steps

1. **Backend Team**: Review this document and answer the questions above
2. **Decision**: Flatten location data in request OR update both backends to accept nested format
3. **Implementation**: Apply Phase 1 changes to local backend
4. **Testing**: Verify all endpoints work with updated schemas
5. **Azure Implementation**: Backend team implements endpoints in Azure Functions
6. **Migration**: Switch frontend to Azure backend via env variable

