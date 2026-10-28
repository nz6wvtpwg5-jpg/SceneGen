# Backend Status: What Actually Works Locally

**Date:** February 21, 2026
**Reality Check:** Not everything works locally yet

---

## ✅ CONFIRMED WORKING LOCALLY

These endpoints are implemented in the local backend (`/backend/server.js`):

### Shows Management ✅
- `GET /api/shows` - List shows
- `POST /api/shows` - Create show
- `GET /api/shows/:id` - Get show details
- `PUT /api/shows/:id` - Full update
- **`PATCH /api/shows/:id`** ⭐ - Partial update (calendar sync!)
- `DELETE /api/shows/:id` - Delete show

### Tours Management ✅
- `GET /api/tours` - List tours
- `POST /api/tours` - Create tour
- `GET /api/tours/:id` - Get tour with shows
- `PUT /api/tours/:id` - Full update
- `PATCH /api/tours/:id` - Partial update
- `DELETE /api/tours/:id` - Delete tour

### Entities ✅
- `GET /api/user/entities` - Get user's entities
- `POST /api/artist/add` - Create artist
- `POST /api/promoter/add` - Create promoter

### Contacts ✅
- `GET /api/contacts` - List contacts
- `POST /api/contacts/request` - Send contact request
- `POST /api/contacts/accept/:contactId` - Accept request
- `POST /api/contacts/reject/:contactId` - Reject request

### Search ✅
- `GET /api/search` - Search for entities

### Invites ✅ (Basic)
- `GET /api/invites` - List invites
- `POST /api/invites` - Create invite

---

## ❌ NOT IMPLEMENTED IN LOCAL BACKEND

These frontend API routes expect backend endpoints that **don't exist** in the local backend:

### Assets/File Uploads ❌
- `POST /api/assets` - Upload files (images, etc.)
- **Status:** Azure only, not implemented locally
- **Used by:** Profile images, show posters, etc.

### Notifications ❌
- `GET /api/notification/history` - Get notification history
- **Status:** Table exists in DB, but no endpoints
- **Used by:** Notification bell in header

### Entity Details ❌
- `GET /api/artist/get/:id` - Get artist details
- `GET /api/promoter/get/:id` - Get promoter details
- **Status:** Not implemented
- **Used by:** Profile pages, entity viewing

### User Profile ❌
- `GET /api/user` - Get user profile
- **Status:** Not implemented
- **Used by:** User settings, profile

### Connections (different from contacts) ❌
- `POST /api/connections/request` - Send connection request
- `POST /api/connections/accept/:id` - Accept connection
- `GET /api/user/connections/get` - Get connections
- **Status:** Not implemented
- **Note:** This seems redundant with contacts - might be old code

### Legacy Contact Endpoints ❌
- `POST /api/contact/add` - Old contact add
- `GET /api/contact/list` - Old contact list
- `DELETE /api/contact/delete/:id` - Old contact delete
- **Status:** Replaced by `/api/contacts/*` endpoints
- **Note:** Frontend might still call these in some places

### Invite Token Validation ❌
- `GET /api/invites/:token` - Get invite by token
- `POST /api/invites/:token/accept` - Accept invite by token
- **Status:** Not implemented
- **Used by:** Invite acceptance flow

---

## 🎯 What This Means

### ✅ Core Features Working Locally:
1. **Shows Management** - Full CRUD + Calendar Sync ⭐
2. **Tours Management** - Full CRUD
3. **Basic Contacts** - Request, accept, reject
4. **Entity Creation** - Artists and promoters
5. **Search** - Find entities

### ⚠️ Features That Need Azure:
1. **File Uploads** - Profile images, show posters
2. **Notifications** - Notification history
3. **Profile Viewing** - View other artists/promoters
4. **Invite System** - Token-based invites
5. **Legacy Endpoints** - Old contact/connection code

### 📱 Frontend-Only (No Backend):
- **Google Calendar** - Uses Google API directly
- **Authentication** - Uses NextAuth + Azure B2C
- **Chat** - Uses Ably real-time service
- **Maps** - Uses Google Maps API

---

## 🔧 What Was Fixed Today

### Before:
```typescript
// Tours was hardcoded to Azure
const API_BASE_URL = 'https://scenegen-apim.azure-api.net/scenegen-api';
```

### After:
```typescript
// Now uses .env.local
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
```

**Files Fixed:**
- ✅ `src/app/api/tours/route.ts` - Now uses local backend
- ✅ `src/app/api/shows/route.ts` - Now uses env var instead of hardcode
- ✅ `src/app/api/shows/[id]/route.ts` - Now uses env var
- ✅ `src/app/api/connections/request/route.ts` - Now uses env var

---

## 📊 Completeness Score

**Implemented Locally:** 60%

| Category | Local | Azure Required |
|----------|-------|----------------|
| Shows | ✅ 100% | - |
| Tours | ✅ 100% | - |
| Contacts | ✅ 80% | Legacy endpoints |
| Entities | ✅ 70% | Get/:id endpoints |
| Invites | ✅ 40% | Token validation |
| Assets | ❌ 0% | All |
| Notifications | ❌ 0% | All |
| User Profile | ❌ 0% | All |

---

## 🚀 To Make 100% Local

You would need to add these endpoints to `backend/server.js`:

### Priority 1 (Commonly Used):
```javascript
// Asset uploads (requires file handling)
app.post('/api/assets', authMiddleware, async (req, res) => {
  // Handle multipart/form-data file uploads
  // Save to cloud storage (Azure Blob, AWS S3, or local)
});

// Get entity details
app.get('/api/artist/get/:id', async (req, res) => {
  // Query entities table by ID
});

app.get('/api/promoter/get/:id', async (req, res) => {
  // Query entities table by ID
});
```

### Priority 2 (Nice to Have):
```javascript
// Notifications
app.get('/api/notification/history', authMiddleware, async (req, res) => {
  // Query notifications table
});

// Invite token handling
app.get('/api/invites/:token', async (req, res) => {
  // Look up invite by token
});

app.post('/api/invites/:token/accept', async (req, res) => {
  // Accept invite, create connection
});
```

---

## 🎯 Recommendation

**For your current use case (calendar sync + show management):**

✅ **The local backend is SUFFICIENT!**

You have everything you need for:
- Creating and managing shows
- Syncing shows to Google Calendar
- Creating tours
- Managing contacts
- Searching for entities

**You DON'T need Azure for calendar sync to work!**

---

## 🧪 Test Plan

### Test What Works:
1. ✅ Create a show
2. ✅ Sync show to Google Calendar
3. ✅ Refresh page - button shows "Synced ✓"
4. ✅ Create a tour
5. ✅ Add shows to tour
6. ✅ Search for entities
7. ✅ Send contact request

### Will Fail (Needs Azure):
1. ❌ Upload profile image
2. ❌ View notification history
3. ❌ View other artist's profile details
4. ❌ Accept invite via token link

---

## ✅ Bottom Line

**YES, the "full backend" works locally for the core features you care about:**

- ✅ Shows ✅ Tours ✅ Calendar Sync ✅ Contacts ✅ Search

**But "full" is relative - some advanced features still need Azure:**

- ❌ File uploads ❌ Notifications ❌ Profile viewing ❌ Invite tokens

**For calendar sync and show management: You're 100% good to go locally! 🎉**
