# 🚀 Quick Start Guide - SceneGen UI V2

**Last Updated:** March 29, 2026

---

## 🖥️ Starting the Application

### 1. Start Backend Server
```bash
cd /Users/jon/Desktop/scenegen/SceneGenUIV2/backend
node server.js > ../backend.log 2>&1 &
```
- **Port:** 5001
- **Logs:** `backend.log` in project root
- **Check status:** `tail -f backend.log`

### 2. Start Frontend Server
```bash
cd /Users/jon/Desktop/scenegen/SceneGenUIV2
npm run dev
```
- **Port:** 3000
- **URL:** http://localhost:3000

### 3. Verify Servers
```bash
# Check if both are running
ps aux | grep -E "node server.js|next dev" | grep -v grep
```

---

## 🎯 Key Features & Status

### ✅ Tours Management
- **Page:** `/tours`
- **Features:**
  - Create, view, and delete tours
  - See tour statistics (shows, fees, costs, profit, miles)
  - Total miles automatically calculated from budgets
- **User:** Artists only (promoters see "Artist Feature Only")

### ✅ Tour Totals
- **Fixed:** NaN/concatenation bug resolved
- **Backend:** Returns proper numeric values (not strings)
- **Calculation:** Sums all budgets' fees, expenses, and distance
- **Display:** Currency-formatted with proper totals

### ✅ Driving Distance
- **API:** `/api/calculate-route-distance`
- **Uses:** Google Maps Distance Matrix API
- **Returns:** Total driving distance in miles
- **Environment:** Requires `GOOGLE_MAPS_API_KEY`

### ✅ Sidebar Counts
- **Auto-refresh:** Updates immediately after:
  - Tour delete
  - Show delete
  - CSV import
  - Tour/show creation
- **Polling:** Also refreshes every 30 seconds
- **Error handling:** Graceful fallback on network issues

---

## 📊 Tour Statistics Breakdown

Each tour card shows:

| Metric | Description | Color |
|--------|-------------|-------|
| **Shows** | Number of shows in tour | Default |
| **Total Fees** | Sum of all agreed fees | Green |
| **Total Costs** | Sum of all expenses | Red |
| **Profit** | Fees - Costs | Green/Red |
| **Total Miles** | Sum of driving distances | Blue |

---

## 🔧 Common Tasks

### Import Shows from CSV
1. Go to `/import`
2. Upload CSV file
3. Map columns to fields
4. Review and confirm
5. ✅ Sidebar counts auto-refresh

### Create a Tour
1. Go to `/tours`
2. Click "Create Tour"
3. Enter tour details
4. Add shows to tour
5. ✅ Statistics auto-calculate

### Delete a Tour
1. Go to `/tours`
2. Click "Delete" on tour card
3. Confirm deletion
4. ✅ Sidebar and page auto-refresh

### View Tour Details
1. Go to `/tours`
2. Click "View Details"
3. See all shows, budgets, and totals
4. ✅ Total miles shown in modal

---

## 🐛 Troubleshooting

### Backend Not Responding
```bash
# Check if backend is running
ps aux | grep "node server.js" | grep -v grep

# Restart backend
pkill -f "node server.js"
cd backend && node server.js > ../backend.log 2>&1 &

# Check logs
tail -f backend.log
```

### Frontend Not Loading
```bash
# Check if frontend is running
ps aux | grep "next dev" | grep -v grep

# Restart frontend
pkill -f "next dev"
npm run dev
```

### Database Issues
```bash
# Check PostgreSQL connection
psql -U scenegen_user -d scenegen_db -c "SELECT COUNT(*) FROM tours;"

# Clean database (if needed)
# See QUICK_FIX_CLEAN_DB.md
```

### "Failed to fetch" Errors
- **Normal:** Intermittent network timing issues
- **Handled:** Silent error handling prevents console spam
- **Action:** Counts will retry automatically every 30s

---

## 📁 Important Files

### Backend
- `backend/server.js` - Main server file (numeric conversion)
- `backend/db.js` - Database connection
- `backend/.env` - Environment variables

### Frontend
- `src/app/tours/page.tsx` - Tours list page
- `src/components/tours/TourDetailsModal.tsx` - Tour modal
- `src/hooks/useTourCount.ts` - Sidebar tour count
- `src/hooks/useShowCount.ts` - Sidebar show count
- `src/store/useCountRefreshStore.ts` - Refresh triggers

### API Routes
- `src/app/api/calculate-route-distance/route.ts` - Google Maps API

---

## 🔐 Environment Variables

Required in `backend/.env`:
```bash
DATABASE_URL=[REDACTED_DATABASE_URL]
JWT_SECRET=your_jwt_secret
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

---

## 📚 Documentation

- `ALL_FIXES_COMPLETE_SUMMARY.md` - Complete status
- `DRIVING_DISTANCE_SOLUTION.md` - Distance calculation
- `SIDEBAR_COUNT_AUTO_REFRESH_FIX.md` - Refresh system
- `QUICK_FIX_CLEAN_DB.md` - Database cleanup
- `BACKEND_ENDPOINT_MAPPING.md` - API reference

---

## ✅ Health Check

**Quick verification:**
```bash
# 1. Check servers running
ps aux | grep -E "node server.js|next dev" | grep -v grep

# 2. Check backend logs (should see periodic requests)
tail -20 backend.log

# 3. Open frontend
open http://localhost:3000

# 4. Login and check:
#    - Tours page loads (/tours)
#    - Sidebar shows counts
#    - Tour cards show statistics with miles
#    - No NaN in totals
```

**Expected Results:**
- ✅ Both servers running
- ✅ Backend logs show successful requests
- ✅ Frontend loads without errors
- ✅ Tour totals calculate correctly
- ✅ Miles displayed as numbers
- ✅ Sidebar counts accurate

---

## 🎉 Success Indicators

**System is healthy when:**
1. No NaN or string concatenation in tour totals
2. Total miles shown on Tours page (blue number)
3. Sidebar counts update after delete/import
4. Backend logs show successful API calls
5. No TypeScript compilation errors
6. No console errors about "Failed to fetch"

---

**Need Help?** Check the documentation files listed above for detailed information on each system.

**Status:** 🟢 ALL SYSTEMS OPERATIONAL
