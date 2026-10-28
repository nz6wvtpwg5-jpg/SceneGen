# Backend Status and Options - SceneGen UIV2

**Date:** Feb 18, 2026
**Issue:** Calendar sync not persisting, shows not loading
**Root Cause:** Backend configuration mismatch

---

## 🔍 Current Situation

### Environment Configuration (.env.local)
```bash
# ACTIVE CONFIGURATION
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
USE_LOCAL_BACKEND=true

# AZURE CONFIGURATION (COMMENTED OUT)
# NEXT_PUBLIC_API_BASE_URL=https://scenegen-apim.azure-api.net/scenegen-api
NEXT_PUBLIC_SUBSCRIPTION_KEY=85a56b9eb87b48179218064bb1da6bab
```

### Test Results

#### Local Backend (localhost:3001)
```bash
$ curl http://localhost:3001/api/shows
❌ Connection failed - No server running on port 3001
```

#### Azure Backend (scenegen-apim.azure-api.net)
```bash
$ curl https://scenegen-apim.azure-api.net/scenegen-api/shows \
  -H "Ocp-Apim-Subscription-Key: 85a56b9eb87b48179218064bb1da6bab"
❌ HTTP 404 Resource Not Found
```

---

## 🎯 The Problem

Your frontend is configured to use `localhost:3001/api`, but:
- ❌ No local backend server is running
- ❌ No backend code exists in this workspace
- ❌ The Azure backend `/shows` endpoint returns 404

This means:
1. **No shows are loading** (API calls fail)
2. **Calendar sync can't persist** (PATCH request fails)
3. **All backend features are broken**

---

## 📋 What Exists vs What's Missing

### ✅ What We Have
- Complete frontend UI for shows, tours, calendar
- Calendar sync logic that creates events in Google Calendar
- API routes that proxy to backend
- TypeScript types for all data models
- Full documentation of required backend endpoints

### ❌ What's Missing
According to `BACKEND_TODO.md` and `BACKEND_REQUIREMENTS.md`:

1. **Shows endpoints NOT implemented:**
   - `GET /shows` - List shows
   - `POST /shows` - Create show
   - `GET /shows/:id` - Get show details
   - **`PATCH /shows/:id`** ← Required for calendar sync!
   - `DELETE /shows/:id` - Delete show

2. **Tours endpoints NOT implemented**
3. **Invites endpoints NOT implemented**
4. **Calendar integration NOT implemented**

The documentation clearly states:
> "The SceneGen frontend is fully built and functional, but the backend API is missing critical endpoints."

---

## 🛠️ Options to Move Forward

### Option 1: Switch to Azure Backend (if /shows exists elsewhere)
The Azure backend might have shows endpoints at a different path.

**Action:**
```bash
# Test if shows endpoint exists at different paths
curl -I https://scenegen-apim.azure-api.net/scenegen-api/v1/shows \
  -H "Ocp-Apim-Subscription-Key: 85a56b9eb87b48179218064bb1da6bab"

# Or check the Azure portal to see what endpoints are deployed
```

**If this works:**
1. Update `.env.local` to use Azure URL
2. Restart Next.js dev server
3. Test shows page

---

### Option 2: Start Local Backend (if backend code exists)
If there's a separate backend repository or folder:

**Action:**
```bash
# Look for backend code
cd ~/Desktop/scenegen
ls -la

# If backend folder exists:
cd backend  # or whatever it's named
npm install
npm start   # or npm run dev
```

**Required backend features for calendar sync:**
- `PATCH /shows/:id` endpoint that accepts:
  ```json
  {
    "google_calendar_event_id": "string"
  }
  ```
- Database column `google_calendar_event_id` in shows table

---

### Option 3: Mock Backend for Development
Create a minimal local backend that supports the shows endpoints.

**Quick Start Script:**
```javascript
// backend-mock.js
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// In-memory show storage
let shows = [
  {
    id: '123',
    venueName: 'Red Rocks Amphitheatre',
    showDate: '2026-07-15T19:00:00Z',
    google_calendar_event_id: null
  }
];

// GET /api/shows
app.get('/api/shows', (req, res) => {
  const entityId = req.headers['x-entity-id'];
  res.json(shows.filter(s => s.entityId === entityId || !s.entityId));
});

// PATCH /api/shows/:id
app.patch('/api/shows/:id', (req, res) => {
  const show = shows.find(s => s.id === req.params.id);
  if (show) {
    Object.assign(show, req.body);
    res.json(show);
  } else {
    res.status(404).json({ error: 'Show not found' });
  }
});

// POST /api/shows
app.post('/api/shows', (req, res) => {
  const newShow = { id: Date.now().toString(), ...req.body };
  shows.push(newShow);
  res.status(201).json(newShow);
});

app.listen(3001, () => {
  console.log('Mock backend running on http://localhost:3001');
});
```

**To use:**
```bash
npm install express cors
node backend-mock.js
```

---

### Option 4: Use Azure Backend with Workarounds
If Azure backend is partially implemented:

**Check what endpoints exist:**
```bash
# Check contacts (this might work)
curl https://scenegen-apim.azure-api.net/scenegen-api/contacts \
  -H "Ocp-Apim-Subscription-Key: 85a56b9eb87b48179218064bb1da6bab" \
  -H "Authorization: Bearer <your-token>"

# Check entities
curl https://scenegen-apim.azure-api.net/scenegen-api/user/entities \
  -H "Ocp-Apim-Subscription-Key: 85a56b9eb87b48179218064bb1da6bab" \
  -H "Authorization: Bearer <your-token>"
```

**Workaround for shows:**
- Store shows in frontend local storage temporarily
- Use Google Calendar as source of truth
- Build minimal backend just for PATCH endpoint

---

## 🎯 Recommended Next Step

**I recommend checking if there's a backend repository or Azure Function code:**

```bash
# 1. Check for backend code
cd ~/Desktop/scenegen
ls -la

# 2. Check if backend is in a different repo
cd ~/Desktop
find . -type d -name "*backend*" -o -name "*api*" 2>/dev/null | grep -v node_modules

# 3. Check Azure portal
# - Log into Azure portal
# - Check if scenegen-apim has deployed functions
# - Look at API endpoints and their status
```

**Once we know what backend infrastructure exists, I can:**
1. Help you start it if it's local
2. Fix the configuration if it's Azure
3. Create a mock backend if nothing exists
4. Guide you through deploying missing endpoints

---

## 📝 Quick Test Commands

```bash
# Test local backend
curl -v http://localhost:3001/api/shows

# Test Azure backend
curl -v https://scenegen-apim.azure-api.net/scenegen-api/shows \
  -H "Ocp-Apim-Subscription-Key: 85a56b9eb87b48179218064bb1da6bab"

# Check what's running on your machine
lsof -i :3001
lsof -i :3000  # Next.js frontend

# Check backend processes
ps aux | grep node
```

---

## 🚨 Important Notes

1. **Frontend is ready** - All UI components work
2. **Calendar integration works** - Events are created in Google Calendar
3. **Only persistence is broken** - Because backend PATCH endpoint doesn't exist
4. **This is expected** - Documentation clearly states backend is not implemented

**The frontend team has done their job. The backend needs to be built or configured.**

---

## 📞 What to Tell Me

Please let me know:
1. Do you have backend code somewhere?
2. Should we use Azure or build local backend?
3. Do you want me to create a mock backend for testing?
4. Should we check Azure portal to see what's deployed?

I can help with any of these options!
