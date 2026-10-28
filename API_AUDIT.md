# SceneGen API Audit

**Date:** January 28, 2026
**Purpose:** Document what's in the OpenAPI specs vs what the frontend expects

---

## 🎯 Executive Summary

**Good News:**
- ✅ Azure backend is fully deployed at `https://scenegen-apim.azure-api.net`
- ✅ Authentication (Azure B2C) is configured
- ✅ Core entity management (artists, promoters) is documented in OpenAPI
- ✅ Contact/connection management is documented
- ✅ Search and chat APIs have OpenAPI specs

**Issues Found:**
- ⚠️ **Shows and Tours endpoints NOT in OpenAPI spec** - May not exist yet
- ⚠️ **GET /user/entities returns limited data** - Only name, id, entityType (missing administratorId and other fields)
- ⚠️ **No duplicate entity check documented** - POST /artist/add doesn't specify 409 response
- ⚠️ **Notification API exists but unclear implementation**

---

## 📊 API Endpoint Status

### ✅ DOCUMENTED & LIKELY WORKING

#### Entity Management
| Endpoint | Method | OpenAPI | Frontend | Status |
|----------|--------|---------|----------|--------|
| `/artist/add` | POST | ✅ | ✅ | Should work, but no 409 for duplicates |
| `/artist/{id}/members/add` | POST | ✅ | ✅ | Documented |
| `/artist/{id}/members/remove` | PATCH | ✅ | ✅ | Documented |
| `/artist/{id}/get` | GET | ✅ | ✅ | Documented |
| `/artist/{id}/update` | PATCH | ✅ | ✅ | Documented |
| `/promoter/add` | POST | ✅ | ✅ | Should work, but no 409 for duplicates |
| `/promoter/{id}/get` | GET | ✅ | ✅ | Documented |
| `/promoter/{id}/update` | PATCH | ✅ | ✅ | Documented |

**Schema: `artistEntityDto`**
```json
{
  "administratorId": "string",
  "users": ["string"],
  "administrators": ["string"],
  "members": [{"name": "string", "responsibility": "string", "id": "string"}],
  "assets": [{"uri": "string", "extension": "string", "fileId": "string", "mimeType": "string"}],
  "id": "string",
  "name": "string",
  "alias": "string",
  "country": "string",
  "city": "string",
  "state": "string",
  "bio": "string"
}
```

#### User Management
| Endpoint | Method | OpenAPI | Frontend | Status |
|----------|--------|---------|----------|--------|
| `/user/entities` | GET | ✅ | ✅ | **LIMITED SCHEMA** ⚠️ |
| `/user/get` | GET | ✅ | ✅ | Documented |
| `/user/update` | PATCH | ✅ | ✅ | Documented |

**Issue: GET /user/entities returns `entitiesMenuViewModel`**
```json
{
  "name": "string",
  "id": "string (uuid)",
  "entityType": "string"
}
```

**Frontend expects FULL entity data with `administratorId`**

This is the **ROOT CAUSE** of the redirect loop issue!

#### Contact Management
| Endpoint | Method | OpenAPI | Frontend | Status |
|----------|--------|---------|----------|--------|
| `/contact/{contactId}/accept` | POST | ✅ | ✅ | Documented |
| `/contact/{contactId}/reject` | POST | ✅ | ✅ | Documented |
| `/contact/request` | POST | ✅ | ✅ | Documented |
| `/contacts` | GET | ✅ | ✅ | Documented |
| `/contacts/potential` | GET | ✅ | ❌ | Not used in frontend |
| `/search/connections` | POST | ✅ | ❌ | Not used in frontend |

#### Search
| Endpoint | Method | OpenAPI | Frontend | Status |
|----------|--------|---------|----------|--------|
| `/search/{segment}` | GET | ✅ | ✅ | Documented in separate spec |

**Note:** Search API is in `scenegen-api-search.openapi+json.json`

#### Chat/Messaging
| Endpoint | Method | OpenAPI | Frontend | Status |
|----------|--------|---------|----------|--------|
| `/chat/conversationhistory` | POST | ✅ | ✅ | Documented in separate spec |
| `/chat/messagehistory` | POST | ✅ | ✅ | Documented in separate spec |
| `/chat/start` | POST | ✅ | ✅ | Documented in separate spec |

**Note:** Chat API is in `scenegen-api-chat.openapi+json.json`

#### Notifications
| Endpoint | Method | OpenAPI | Frontend | Status |
|----------|--------|---------|----------|--------|
| `/notification/history` | GET | ✅ | ✅ | Documented |

---

### ❌ NOT DOCUMENTED (Likely Not Implemented Yet)

#### Shows Management
| Endpoint | Method | OpenAPI | Frontend | Status |
|----------|--------|---------|----------|--------|
| `/shows` | GET | ❌ | ✅ | **NOT IN SPEC** |
| `/shows` | POST | ❌ | ✅ | **NOT IN SPEC** |
| `/shows/{id}` | GET | ❌ | ✅ | **NOT IN SPEC** |
| `/shows/{id}` | PATCH | ❌ | ✅ | **NOT IN SPEC** |
| `/shows/{id}` | DELETE | ❌ | ✅ | **NOT IN SPEC** |
| `/shows/bulk-update` | POST | ❌ | ✅ | **NOT IN SPEC** |

**Frontend expects:**
```typescript
interface Show {
  id: string;
  date: string;
  venue: string;
  city: string;
  state?: string;
  country: string;
  status: 'confirmed' | 'proposed' | 'cancelled';
  tourId?: string;
  tourName?: string;
  fee?: number;
  notes?: string;
}
```

#### Tours Management
| Endpoint | Method | OpenAPI | Frontend | Status |
|----------|--------|---------|----------|--------|
| `/tours` | GET | ❌ | ✅ | **NOT IN SPEC** |
| `/tours` | POST | ❌ | ✅ | **NOT IN SPEC** |
| `/tours/{id}` | GET | ❌ | ✅ | **NOT IN SPEC** |
| `/tours/{id}` | PATCH | ❌ | ✅ | **NOT IN SPEC** |
| `/tours/{id}` | DELETE | ❌ | ✅ | **NOT IN SPEC** |

**Frontend expects:**
```typescript
interface Tour {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  status?: 'planning' | 'confirmed' | 'completed' | 'cancelled';
  showCount?: number;
  notes?: string;
}
```

#### Invites
| Endpoint | Method | OpenAPI | Frontend | Status |
|----------|--------|---------|----------|--------|
| `/invites` | GET | ❌ | ✅ | Unknown - frontend expects it |

---

## 🔍 Critical Issues to Fix

### Issue #1: GET /user/entities Returns Limited Data ⚠️⚠️⚠️

**Current Schema (per OpenAPI):**
```json
{
  "name": "string",
  "id": "string",
  "entityType": "string"
}
```

**Frontend Needs:**
```json
{
  "id": "string",
  "administratorId": "string",  // ← CRITICAL for ownership check
  "entityType": "artist" | "promoter",
  "name": "string",
  "city": "string",
  "state": "string",
  "country": "string",
  "bio": "string",
  "genres": ["string"],
  "profileImageUrl": "string",
  "headerImageUrl": "string"
  // ... all other entity fields
}
```

**Why This Matters:**
- Frontend uses `administratorId` to check if user owns the entity
- Without it, the ownership check fails → redirect loop
- The bypass in `useOnboardingRedirect.ts` was added because of this

**Backend Fix Required:**
Either:
1. **Option A:** Change GET `/user/entities` to return full entity objects (breaking change)
2. **Option B:** Frontend should call GET `/artist/{id}/get` after getting the entity list

**Recommendation:** Option A - The endpoint is called "entities" so it should return full entity data, not just menu items.

---

### Issue #2: No Duplicate Entity Check

**Current Behavior (per OpenAPI):**
- POST `/artist/add` returns 200 or 400
- No 409 Conflict documented

**Frontend Expects:**
- POST `/artist/add` should return **409 Conflict** if user already owns an entity
- Response body: `{ "error": "You already own an entity" }`

**Backend Fix Required:**
```sql
-- Before creating entity:
SELECT id FROM entities WHERE administratorId = @userId

-- If result exists:
RETURN 409 Conflict

-- Else:
INSERT INTO entities (...)
RETURN 200 OK
```

**Why This Matters:**
- Prevents users from creating multiple entities
- Frontend depends on 409 to show proper error message

---

### Issue #3: Shows & Tours Not in OpenAPI Spec

**Status:** These endpoints may not exist yet in the Azure backend.

**What Frontend Needs:**

**Shows:**
```
GET    /shows                 - List all shows for current entity
POST   /shows                 - Create new show
GET    /shows/{id}           - Get show details
PATCH  /shows/{id}           - Update show
DELETE /shows/{id}           - Delete show
POST   /shows/bulk-update    - Update multiple shows (optional)
```

**Tours:**
```
GET    /tours                 - List all tours (artist-only)
POST   /tours                 - Create new tour (artist-only)
GET    /tours/{id}           - Get tour details with shows
PATCH  /tours/{id}           - Update tour
DELETE /tours/{id}           - Delete tour
```

**Backend Action Required:**
- Add these endpoints to Azure Functions
- Document in OpenAPI spec
- Implement proper authorization (artists vs promoters)

---

## 🧪 Testing Plan

### Phase 1: Test What's Documented ✅

Test these endpoints first (they should work):

1. **Authentication**
   - Sign in with Azure B2C
   - Get JWT token

2. **Entity Creation**
   - POST `/artist/add` - Create artist
   - POST `/promoter/add` - Create promoter
   - Try creating duplicate (check if 409 returned)

3. **Entity Retrieval**
   - GET `/user/entities` - Check what fields are returned
   - GET `/artist/{id}/get` - Get full artist data
   - Verify `administratorId` is present

4. **Profile Updates**
   - PATCH `/artist/{id}/update` - Update bio, location
   - POST `/artist/{id}/members/add` - Add band members

5. **Contacts**
   - POST `/contact/request` - Send connection request
   - GET `/contacts` - List contacts
   - POST `/contact/{id}/accept` - Accept request

6. **Search**
   - GET `/search/{query}` - Search for entities

### Phase 2: Test Undocumented Endpoints ❌

Test these to see if they exist:

1. **Shows**
   - GET `/shows` - Does it return 404 or data?
   - POST `/shows` - Can you create a show?

2. **Tours**
   - GET `/tours` - Does it return 404 or data?
   - POST `/tours` - Can you create a tour?

3. **Invites**
   - GET `/invites` - Does it exist?

### Phase 3: Test Real-Time Features 🔔

1. **Chat** (Ably)
   - Send message
   - Receive real-time updates

2. **Notifications**
   - GET `/notification/history`
   - Check real-time notifications

---

## 📝 Testing Commands

You can test the backend directly with curl:

```bash
# Get your JWT token from browser DevTools → Application → Session Storage
TOKEN="your-jwt-token-here"

# Test GET /user/entities
curl -X GET \
  "https://scenegen-apim.azure-api.net/scenegen-api/user/entities" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Ocp-Apim-Subscription-Key: 85a56b9eb87b48179218064bb1da6bab" \
  | jq

# Test POST /artist/add
curl -X POST \
  "https://scenegen-apim.azure-api.net/scenegen-api/artist/add" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Ocp-Apim-Subscription-Key: 85a56b9eb87b48179218064bb1da6bab" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Band",
    "city": "Brooklyn",
    "state": "New York",
    "country": "United States",
    "bio": "Test bio"
  }' | jq

# Test GET /shows (to see if it exists)
curl -X GET \
  "https://scenegen-apim.azure-api.net/scenegen-api/shows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Ocp-Apim-Subscription-Key: 85a56b9eb87b48179218064bb1da6bab" \
  | jq
```

---

## 🎯 Priority Action Items

### For Backend Team (Azure Functions):

**CRITICAL (Week 1):**
1. ✅ Fix GET `/user/entities` to return full entity data with `administratorId`
2. ✅ Add duplicate entity check (return 409) to POST `/artist/add` and `/promoter/add`
3. ❌ Implement shows endpoints (GET, POST, PATCH, DELETE `/shows`)
4. ❌ Implement tours endpoints (GET, POST, PATCH, DELETE `/tours`)

**HIGH PRIORITY (Week 2):**
5. Update OpenAPI specs with new endpoints
6. Test all endpoints with Postman/curl
7. Add proper error responses (400, 401, 403, 409, 500)

**MEDIUM PRIORITY (Week 3):**
8. Implement invites endpoint (if needed)
9. Add bulk operations for shows
10. Add tour-show associations

### For Frontend Team:

**IMMEDIATE:**
1. Test what's documented in OpenAPI
2. Update `TESTING_CHECKLIST.md` with actual results
3. Document which features work vs which don't

**AFTER BACKEND FIXES:**
1. Remove temporary bypass in `useOnboardingRedirect.ts`
2. Test complete onboarding flow
3. Enable shows/tours pages (or show "Coming Soon" message)

---

## 📚 Reference Links

- **Azure API Management:** https://scenegen-apim.azure-api.net
- **Main API Spec:** `/openapi/scenegen-api.openapi+json.json`
- **Search API Spec:** `/openapi/scenegen-api-search.openapi+json.json`
- **Chat API Spec:** `/openapi/scenegen-api-chat.openapi+json.json`
- **Notification API Spec:** `/openapi/scenegen-api-notification.openapi+json.json`

---

## 💡 Next Steps

1. **Run manual tests** using the dev server (already running on port 3001)
2. **Test documented endpoints** from Phase 1 above
3. **Update this document** with actual test results
4. **Create detailed backend tickets** for missing endpoints
5. **Coordinate with backend team** on timeline for fixes

---

**Questions? Issues found during testing?**
Document them here and we'll prioritize fixes accordingly.
