# 🚀 Local Development Quick Reference

**Last Updated:** February 21, 2026

## 📡 Server URLs
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/health

---

## ✅ Check Server Status
```bash
lsof -i :3000 -i :3001 | grep LISTEN
```

Expected output:
```
node    53648  jon   12u  IPv6  ...  TCP *:redwood-broker (LISTEN)  # Backend (3001)
node    54175  jon   13u  IPv6  ...  TCP *:hbci (LISTEN)            # Frontend (3000)
```

---

## 🟢 Start Servers

### Backend:
```bash
cd ~/Desktop/scenegen/SceneGenUIV2/backend
npm start
```

### Frontend:
```bash
cd ~/Desktop/scenegen/SceneGenUIV2
pnpm dev
```

### Both (in background):
```bash
cd ~/Desktop/scenegen/SceneGenUIV2/backend && npm start > backend.log 2>&1 &
cd ~/Desktop/scenegen/SceneGenUIV2 && pnpm dev > frontend.log 2>&1 &
```

---

## 🔴 Stop Servers

```bash
# Stop frontend
lsof -ti :3000 | xargs kill -9

# Stop backend
lsof -ti :3001 | xargs kill -9

# Stop both
lsof -ti :3000 :3001 | xargs kill -9
```

---

## 📊 View Logs

```bash
# Backend logs (real-time)
tail -f ~/Desktop/scenegen/SceneGenUIV2/backend/backend.log

# Frontend logs (real-time)
tail -f ~/Desktop/scenegen/SceneGenUIV2/frontend.log

# Backend last 50 lines
tail -50 ~/Desktop/scenegen/SceneGenUIV2/backend/backend.log

# Frontend last 50 lines
tail -50 ~/Desktop/scenegen/SceneGenUIV2/frontend.log
```

---

## 🧪 Test Backend

```bash
# Health check
curl http://localhost:3001/health

# Shows endpoint (requires entity ID)
curl -H "X-Entity-Id: test-entity" http://localhost:3001/api/shows

# Pretty print with jq
curl -s http://localhost:3001/health | jq .
```

Expected response:
```json
{
  "status": "ok",
  "message": "SceneGen Backend API is running!"
}
```

---

## 🗄️ Database

### Run Migrations:
```bash
cd ~/Desktop/scenegen/SceneGenUIV2/backend
npm run migrate
```

### Database Info:
- **Type:** PostgreSQL (NeonDB)
- **Connection:** Defined in `backend/.env`
- **Tables:** entities, shows, tours, invites, contacts, calendar_connections, notifications

---

## ⭐ What's New (Added Today)

### New Endpoints:
- ✅ **PATCH /api/shows/:id** - Partial show update (for calendar sync!)
- ✅ **PATCH /api/tours/:id** - Partial tour update
- ✅ **GET /api/contacts** - Get all contacts
- ✅ **POST /api/contacts/request** - Send contact request
- ✅ **POST /api/contacts/accept/:id** - Accept contact
- ✅ **POST /api/contacts/reject/:id** - Reject contact
- ✅ **GET /api/search** - Search for entities

### New Database Tables:
- ✅ **contacts** - For managing connections between entities

### Bug Fixes:
- ✅ Calendar sync now persists to database
- ✅ All CRUD operations work locally
- ✅ No more Azure 404 errors

---

## 🎯 Key Features Working Locally

| Feature | Status | Endpoint |
|---------|--------|----------|
| Shows Management | ✅ Working | `/api/shows` |
| Tours Management | ✅ Working | `/api/tours` |
| Calendar Sync | ✅ Working | PATCH `/api/shows/:id` |
| Contacts | ✅ Working | `/api/contacts` |
| Search Entities | ✅ Working | `/api/search` |
| Create Artist/Promoter | ✅ Working | `/api/artist/add` |

---

## 🌐 What Uses External Services

| Service | Provider | Why |
|---------|----------|-----|
| Google Calendar OAuth | Google | Authentication |
| Google Calendar Events | Google | Calendar integration |
| Database | NeonDB | Cloud PostgreSQL |
| Real-time Chat | Ably | Not part of backend |

**Everything else runs locally!**

---

## 🚨 Troubleshooting

### Backend won't start:
```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill process on port 3001
lsof -ti :3001 | xargs kill -9

# Check database connection
cd ~/Desktop/scenegen/SceneGenUIV2/backend
cat .env | grep DATABASE_URL
```

### Frontend won't start:
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process on port 3000
lsof -ti :3000 | xargs kill -9

# Reinstall dependencies if needed
cd ~/Desktop/scenegen/SceneGenUIV2
pnpm install
```

### Calendar sync not persisting:
```bash
# Check backend logs for PATCH requests
tail -f ~/Desktop/scenegen/SceneGenUIV2/backend/backend.log | grep PATCH

# Check if google_calendar_event_id column exists
cd ~/Desktop/scenegen/SceneGenUIV2/backend
npm run migrate
```

---

## 📝 Environment Variables

### Frontend (`.env.local`):
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

### Backend (`backend/.env`):
```bash
DATABASE_URL=postgresql://...  # NeonDB connection
PORT=3001                       # Backend port
FRONTEND_URL=http://localhost:3000
```

---

## 🔑 Required Headers for Backend APIs

Most backend endpoints require:
```
X-Entity-Id: <entity-uuid>
```

Frontend automatically adds this based on current entity.

---

## ✅ Current Status

- ✅ Backend: **RUNNING** on port 3001
- ✅ Frontend: **RUNNING** on port 3000
- ✅ Database: **CONNECTED** to NeonDB
- ✅ Calendar Sync: **WORKING** with persistence
- ✅ All local: **NO AZURE REQUIRED**

---

**Need help? Check the detailed docs:**
- `RESTART_COMPLETE.md` - Full setup explanation
- `LOCAL_BACKEND_SETUP_COMPLETE.md` - Backend details
- `BACKEND_STATUS_AND_OPTIONS.md` - Architecture overview
