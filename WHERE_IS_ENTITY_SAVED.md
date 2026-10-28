# Entity Creation Flow - Where & How Data Is Saved

## 🎯 Overview

When you create an artist entity through the SceneGen frontend, here's the complete journey of your data:

---

## 📊 The Complete Flow

### 1️⃣ Frontend: Onboarding Form (`/onboarding`)
**File:** `/src/app/onboarding/page.tsx`

**You fill out:**
- Name: "Test Artist" *(required)*
- Bio: "Testing SceneGen"
- City: "Melbourne"
- State: "VIC"
- Country: "Australia"

**What happens:**
```javascript
// When you click "Create Artist Profile"
const response = await fetch('/api/artist/add', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: "Test Artist",
    bio: "Testing SceneGen",
    city: "Melbourne",
    state: "VIC",
    country: "Australia"
  }),
});
```

---

### 2️⃣ Next.js API Route (Proxy Layer)
**File:** `/src/app/api/artist/add/route.ts`

**What it does:**
1. ✅ Validates you're authenticated (checks Bearer token)
2. ✅ Validates required fields (name must exist)
3. ✅ Forwards your request to Azure backend
4. ✅ Returns response to frontend

**The proxy call:**
```javascript
const apiUrl = `${API_BASE_URL}/artist/add`;
// API_BASE_URL = https://scenegen-apim.azure-api.net/scenegen-api

const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Authorization': finalToken,
    'Content-Type': 'application/json',
    'Ocp-Apim-Subscription-Key': process.env.SUBSCRIPTION_KEY
  },
  body: JSON.stringify(body)
});
```

**From `.env.local`:**
```bash
NEXT_PUBLIC_API_BASE_URL=https://scenegen-apim.azure-api.net/scenegen-api
SUBSCRIPTION_KEY=85a56b9eb87b48179218064bb1da6bab
```

---

### 3️⃣ Azure API Management (APIM)
**URL:** `https://scenegen-apim.azure-api.net/scenegen-api/artist/add`

**What it does:**
1. ✅ Verifies the subscription key
2. ✅ Applies rate limiting / throttling policies
3. ✅ Routes request to backend service
4. ✅ Logs API calls for monitoring
5. ✅ Returns response to Next.js proxy

**This is a gateway/router layer - no data is stored here.**

---

### 4️⃣ Azure Backend Service (Your C# API)
**Endpoint:** `POST /artist/add`

**What it SHOULD do:** *(Based on BACKEND_REQUIREMENTS.md)*

1. **Extract user ID from JWT token:**
   ```csharp
   var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
   ```

2. **Check if user already owns an entity:**
   ```sql
   SELECT id
   FROM entities
   WHERE administratorId = @userId
   LIMIT 1;
   ```
   - If found → Return `409 Conflict`
   - If not found → Continue to step 3

3. **Insert the entity into database:**
   ```sql
   INSERT INTO entities (
     id,
     administratorId,  -- Your user ID
     entityType,       -- 'artist'
     name,            -- 'Test Artist'
     bio,             -- 'Testing SceneGen'
     city,            -- 'Melbourne'
     state,           -- 'VIC'
     country,         -- 'Australia'
     createdAt,
     updatedAt
   ) VALUES (
     NEWID(),
     @userId,
     'artist',
     @name,
     @bio,
     @city,
     @state,
     @country,
     GETUTCDATE(),
     GETUTCDATE()
   );
   ```

4. **Return the created entity:**
   ```json
   {
     "id": "abc-123-def-456",
     "administratorId": "your-user-id",
     "entityType": "artist",
     "name": "Test Artist",
     "bio": "Testing SceneGen",
     "city": "Melbourne",
     "state": "VIC",
     "country": "Australia",
     "createdAt": "2026-01-28T10:30:00Z",
     "updatedAt": "2026-01-28T10:30:00Z"
   }
   ```

---

### 5️⃣ Azure SQL Database
**Where the data is ACTUALLY saved.**

**Database:** SceneGen SQL Database (Azure)
**Table:** `entities`

**Schema:**
```sql
CREATE TABLE entities (
  id                UUID PRIMARY KEY,
  administratorId   UUID NOT NULL,           -- Your user ID (foreign key to users table)
  entityType        VARCHAR(20) NOT NULL,    -- 'artist' or 'promoter'
  name              VARCHAR(255) NOT NULL,
  alias             VARCHAR(255),
  bio               TEXT,
  city              VARCHAR(100),
  state             VARCHAR(100),
  country           VARCHAR(100),
  profileImageUrl   VARCHAR(500),
  headerImageUrl    VARCHAR(500),
  genres            JSONB,                   -- Array of genre strings
  createdAt         TIMESTAMP NOT NULL,
  updatedAt         TIMESTAMP NOT NULL,

  -- Constraints
  FOREIGN KEY (administratorId) REFERENCES users(id),
  CHECK (entityType IN ('artist', 'promoter'))
);

-- Index for fast ownership lookups
CREATE INDEX idx_entities_administrator
ON entities(administratorId);
```

**Your entity row looks like:**
```
| id          | administratorId | entityType | name        | bio                | city      | state | country   |
|-------------|-----------------|------------|-------------|--------------------|-----------| ------|-----------|
| abc-123-... | your-user-id    | artist     | Test Artist | Testing SceneGen   | Melbourne | VIC   | Australia |
```

---

## 🔍 How to Verify the Entity Was Saved

### Option 1: Frontend - Check Sidebar
After creation, your entity should appear in the sidebar dropdown.

**How it works:**
```javascript
// GET /api/user/entities
// Returns all entities where administratorId = your user ID
```

### Option 2: API Call - Direct Query
```bash
curl -X GET \
  "https://scenegen-apim.azure-api.net/scenegen-api/user/entities" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Ocp-Apim-Subscription-Key: 85a56b9eb87b48179218064bb1da6bab"
```

### Option 3: Browser Console
```javascript
// Open DevTools (F12) and run:
fetch('/api/user/entities', {
  headers: {
    'Authorization': 'Bearer ' + (await fetch('/api/auth/session').then(r => r.json())).access_token
  }
}).then(r => r.json()).then(console.log)
```

### Option 4: Database Query (Backend Team)
```sql
-- Query the database directly
SELECT
  id,
  administratorId,
  entityType,
  name,
  city,
  country,
  createdAt
FROM entities
WHERE administratorId = 'your-user-id'
ORDER BY createdAt DESC;
```

---

## 🗂️ Complete Data Model

### entities Table
```sql
CREATE TABLE entities (
  -- Primary fields
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  administratorId   UUID NOT NULL,
  entityType        VARCHAR(20) NOT NULL CHECK (entityType IN ('artist', 'promoter')),

  -- Basic info
  name              VARCHAR(255) NOT NULL,
  alias             VARCHAR(255),
  bio               TEXT,

  -- Location
  city              VARCHAR(100),
  state             VARCHAR(100),
  country           VARCHAR(100),

  -- Media
  profileImageUrl   VARCHAR(500),
  headerImageUrl    VARCHAR(500),

  -- Artist-specific
  genres            JSONB,  -- ['Rock', 'Indie', 'Alternative']

  -- Timestamps
  createdAt         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign keys
  CONSTRAINT fk_administrator FOREIGN KEY (administratorId) REFERENCES users(id) ON DELETE CASCADE
);
```

### Related Tables

#### members (Artist band members)
```sql
CREATE TABLE members (
  id              UUID PRIMARY KEY,
  entityId        UUID NOT NULL,
  name            VARCHAR(255) NOT NULL,
  responsibility  VARCHAR(255),  -- 'Lead Vocals', 'Guitar', etc.
  FOREIGN KEY (entityId) REFERENCES entities(id) ON DELETE CASCADE
);
```

#### assets (Profile images, media)
```sql
CREATE TABLE assets (
  id        UUID PRIMARY KEY,
  entityId  UUID NOT NULL,
  uri       VARCHAR(500) NOT NULL,
  fileId    VARCHAR(255),
  extension VARCHAR(10),
  mimeType  VARCHAR(100),
  FOREIGN KEY (entityId) REFERENCES entities(id) ON DELETE CASCADE
);
```

#### socialLinks (Social media)
```sql
CREATE TABLE socialLinks (
  id        UUID PRIMARY KEY,
  entityId  UUID NOT NULL,
  spotify   VARCHAR(500),
  instagram VARCHAR(500),
  facebook  VARCHAR(500),
  website   VARCHAR(500),
  FOREIGN KEY (entityId) REFERENCES entities(id) ON DELETE CASCADE
);
```

---

## 🔐 Security & Ownership

### How Ownership Works:
1. **Your user ID** is extracted from the JWT token (automatically by Azure AD B2C)
2. **administratorId field** links the entity to your user account
3. **Only you** can edit/delete entities where `administratorId = your user ID`

### Enforcement:
```sql
-- Backend queries should ALWAYS filter by administratorId
SELECT * FROM entities
WHERE id = @entityId
AND administratorId = @userId;  -- ← Security check!

-- Prevents users from modifying other users' entities
```

---

## 🚧 Current Backend Issues

### ⚠️ Issue 1: Missing administratorId in GET /user/entities
**Problem:** The backend returns a simplified "menu" object without `administratorId`.

**Impact:** Frontend cannot verify entity ownership, causing redirect loops.

**Status:** ❌ Not fixed yet
**Workaround:** Entity check is temporarily disabled (`DISABLE_ENTITY_CHECK = true`)

**Fix Required:** See `BACKEND_REQUIREMENTS.md` Priority 1

---

### ⚠️ Issue 2: No Duplicate Check
**Problem:** Backend doesn't check if user already owns an entity before creating.

**Impact:** Users can create multiple entities (violates "one entity per user" rule).

**Expected:** Return `409 Conflict` if user already has an entity.

**Status:** ❌ Not implemented yet

**Fix Required:** See `BACKEND_REQUIREMENTS.md` Priority 2

---

## 📚 Related Documentation

- **`BACKEND_REQUIREMENTS.md`** - Full backend API specification
- **`BACKEND_TODO.md`** - List of backend tasks and fixes needed
- **`API_AUDIT.md`** - Current status of all API endpoints
- **`HOW_TO_TEST_ENTITY_CREATION.md`** - Testing guide
- **`ENTITY_CREATION_TEST_RESULTS.md`** - Template to record test results

---

## 🎯 Summary

### Where is the data saved?
**Azure SQL Database** → `entities` table in the SceneGen database

### How does it get there?
1. **You submit form** → Frontend (`/onboarding`)
2. **Frontend calls** → Next.js API (`/api/artist/add`)
3. **Next.js proxies** → Azure APIM
4. **APIM routes** → Azure Backend Service (C# API)
5. **Backend inserts** → Azure SQL Database
6. **Response flows back** through the same chain

### What gets saved?
- Entity ID (UUID, auto-generated)
- **Your user ID** (administratorId, from JWT token)
- Entity type (artist/promoter)
- Name, bio, location
- Timestamps (createdAt, updatedAt)

### How to verify?
- Check sidebar dropdown (frontend)
- Call GET `/api/user/entities` (API)
- Query database directly (backend team)

---

**Bottom line:** Your entity is saved in a real Azure SQL database, managed by your backend team. The frontend just collects the data and passes it through the API gateway to the backend service. 🚀
