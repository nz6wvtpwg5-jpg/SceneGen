# 🗺️ Venue Address & Route Mapping - README

> **TL;DR:** Venue addresses can now be collected during CSV import using Google Places Autocomplete, and tour routes are visualized on Google Maps. Everything is implemented and ready for testing.

---

## 🎯 What This Feature Does

### For Users
1. **Import tours from CSV** (existing functionality)
2. **Add venue addresses** during import (NEW!)
   - Search for venues using Google Places
   - Get precise coordinates automatically
   - Skip if you don't have addresses yet
3. **View tour routes on a map** (NEW!)
   - See all stops as markers
   - View driving routes between venues
   - Click markers for venue details

### For the System
- Stores full venue addresses and GPS coordinates
- Handles tours with 2-100+ stops (auto-segments large routes)
- Backward compatible (existing shows without addresses still work)
- Optional (users can skip address entry)

---

## ✅ Current Status

**Implementation:** ✅ **100% Complete**

**Testing:** ⏳ **Ready for Manual Testing**

| Component | Status |
|-----------|--------|
| Database Schema | ✅ Done |
| Backend API | ✅ Done |
| Frontend UI | ✅ Done |
| Google Maps Integration | ✅ Done |
| Documentation | ✅ Done |
| Manual Testing | ⏳ Pending |

---

## 🚀 Quick Start

### For Testers

**Test it now:**

```bash
# 1. Verify setup
cd /Users/jon/Desktop/scenegen/SceneGenUIV2/backend
./verify-venue-import.sh

# 2. Start servers (if not running)
# Terminal 1 - Backend
npm start

# Terminal 2 - Frontend (from project root)
npm run dev

# 3. Test the feature
# Open http://localhost:3000/import
# Follow the on-screen instructions
```

**What to test:**
1. Upload a CSV with show data
2. Map the fields (date, city, venue, fee)
3. **NEW STEP:** Enter venue addresses
   - Type venue name or address
   - Click on dropdown suggestion
   - Look for green checkmark ✓
4. Complete import
5. View tour and see the map

**Success indicators:**
- ✅ Green checkmarks appear after selecting addresses
- ✅ Coordinates display (e.g., "40.7197, -73.9366")
- ✅ Counter shows "X of Y venues have valid coordinates"
- ✅ Map displays markers and routes

### For Developers

**Verify code:**

```bash
# Check database schema
psql "$DATABASE_URL" -c "\d shows" | grep venue

# Expected:
# venue_address | text
# venue_lat     | numeric(10,8)
# venue_lng     | numeric(11,8)

# Check recent imports
./backend/verify-venue-import.sh
```

**Key files:**
- `src/app/import/components/Step3Validation.tsx` - Address collection UI
- `src/components/maps/PlacesAutocomplete.tsx` - Google Places input
- `src/components/maps/TourMap.tsx` - Map visualization
- `backend/server.js:2852` - Import endpoint

---

## 📚 Documentation

**Start here:**
1. [**VENUE_ADDRESS_INDEX.md**](./VENUE_ADDRESS_INDEX.md) - Documentation index
2. [**VENUE_ADDRESS_SUMMARY.md**](./VENUE_ADDRESS_SUMMARY.md) - Implementation summary
3. [**VENUE_ADDRESS_MANUAL_TEST.md**](./VENUE_ADDRESS_MANUAL_TEST.md) - Testing guide

**Reference:**
- [Quick Reference](./VENUE_ADDRESS_QUICK_REFERENCE.md) - Quick troubleshooting
- [Architecture](./VENUE_ADDRESS_ARCHITECTURE.md) - System design
- [Debug Guide](./VENUE_ADDRESS_DEBUG_GUIDE.md) - Detailed debugging

---

## 🎓 How It Works

### User Flow

```
┌──────────┐    ┌──────────┐    ┌─────────────┐    ┌─────────┐
│  Upload  │ →  │   Map    │ →  │    Enter    │ →  │ Import  │
│   CSV    │    │  Fields  │    │  Addresses  │    │  Data   │
└──────────┘    └──────────┘    └─────────────┘    └─────────┘
                                       ↓
                                  ┌─────────┐
                                  │ Google  │
                                  │ Places  │
                                  └─────────┘
```

### Data Flow

```
PlacesAutocomplete
    ↓ (user selects address)
showAddresses state { 0: { address, lat, lng }, ... }
    ↓ (on import)
Merge into show data
    ↓ (POST request)
Backend API
    ↓ (SQL INSERT)
Database (venue_address, venue_lat, venue_lng)
    ↓ (on tour view)
TourMap component
    ↓ (Google Maps)
Visualized routes & markers
```

---

## 🔍 Verification

### Quick Check

```bash
# Run this after testing
cd backend
./verify-venue-import.sh
```

**What it checks:**
- ✅ Database schema
- ✅ Indexes
- ✅ Recent imports
- ✅ Address coverage percentage

### Manual Verification

**Frontend:**
- Open browser console
- Look for: `📍 Address selected for show X`
- Look for: `🗺️ Total shows with coordinates: X / Y`

**Backend:**
- Check terminal where `node server.js` is running
- Look for: `📥 Bulk import request`
- Look for: `✅ Created X shows`

**Database:**
```sql
SELECT venue_name, venue_address, venue_lat, venue_lng
FROM shows
ORDER BY created_at DESC
LIMIT 5;
```

---

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| No dropdown suggestions | Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to `.env.local` |
| No checkmark after typing | Must click dropdown suggestion, not just type |
| Coordinates are NULL | Ensure you selected from dropdown (green checkmark) |
| Map shows no routes | Need at least 2 venues with coordinates |

---

## 🧪 Test Scenarios

### Scenario 1: All Addresses (Best Case)
- Enter addresses for all shows
- All get green checkmarks
- Map shows complete route

### Scenario 2: Partial Addresses
- Enter addresses for some shows
- Only those get checkmarks
- Map shows route for addressed venues

### Scenario 3: No Addresses
- Skip all address entries
- Import still works
- Map shows "No venue coordinates available"

---

## 🎯 Next Steps

### Immediate
1. [ ] Run verification script
2. [ ] Test import flow manually
3. [ ] Verify addresses save correctly
4. [ ] Test map visualization

### Short Term
1. [ ] Complete all test scenarios
2. [ ] Test edge cases (large tours, single show, etc.)
3. [ ] Document any bugs found
4. [ ] Fix critical issues (if any)

### Long Term (Optional Enhancements)
1. [ ] Require addresses (make them mandatory)
2. [ ] Add bulk address entry
3. [ ] Allow editing addresses post-import
4. [ ] Smart defaults based on venue name

---

## 📊 Statistics

**Database State (as of last check):**
- Total shows: 322
- Shows with addresses: 322 (100%)
- Shows with coordinates: 0 (0%)

**Why 0% coordinates?** Users haven't used the new address entry feature yet. The 100% with addresses shows default "TBD" values.

**After first real test, expect:**
- Shows with coordinates: X (where X = number of addresses you enter)

---

## 🛠️ Environment Setup

**Required:**
```bash
# Backend .env
DATABASE_URL=postgresql://...
PORT=3001

# Frontend .env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key-here
```

**Verify:**
```bash
# Backend running
curl http://localhost:3001/api/health

# Frontend running
open http://localhost:3000

# Google Maps API key loaded
# (Check browser console - should have no API key errors)
```

---

## 💡 Tips

### For Testing
- Use real venue names for better results ("Brooklyn Steel" vs "Venue A")
- Select from dropdown, don't just type
- Look for green checkmarks to confirm success
- Check console logs if something seems wrong

### For Development
- Console logs are your friend (📍, 🗺️, ✅, etc.)
- Run verification script often
- Test with different CSV files
- Don't forget to restart dev server after `.env` changes

### For Debugging
1. Check browser console first
2. Check network request payload
3. Check backend terminal logs
4. Query database directly
5. Consult debug guide

---

## 🎉 Success Criteria

Feature is successful when:

- [x] Code is complete ✅
- [x] Database is ready ✅
- [x] Documentation exists ✅
- [ ] Manual tests pass ⏳
- [ ] No console errors ⏳
- [ ] Data saves correctly ⏳
- [ ] Map displays correctly ⏳

**Current Status:** 3/7 complete, 4 pending testing

---

## 📞 Support

**Need help?**

1. Check [Quick Reference](./VENUE_ADDRESS_QUICK_REFERENCE.md) first
2. Run `./backend/verify-venue-import.sh`
3. Consult [Debug Guide](./VENUE_ADDRESS_DEBUG_GUIDE.md)
4. Review [Architecture](./VENUE_ADDRESS_ARCHITECTURE.md)

**Found a bug?**
Include: steps to reproduce, console logs, network payload, database results

---

## 🔗 Links

- [Documentation Index](./VENUE_ADDRESS_INDEX.md)
- [Implementation Summary](./VENUE_ADDRESS_SUMMARY.md)
- [Manual Testing Guide](./VENUE_ADDRESS_MANUAL_TEST.md)
- [Quick Reference](./VENUE_ADDRESS_QUICK_REFERENCE.md)
- [Architecture](./VENUE_ADDRESS_ARCHITECTURE.md)
- [Debug Guide](./VENUE_ADDRESS_DEBUG_GUIDE.md)

---

**Ready to test?** → [Follow the Manual Testing Guide](./VENUE_ADDRESS_MANUAL_TEST.md)

**Questions?** → [Check the Quick Reference](./VENUE_ADDRESS_QUICK_REFERENCE.md)

**Issues?** → [Consult the Debug Guide](./VENUE_ADDRESS_DEBUG_GUIDE.md)

---

**Status:** ✅ Implementation Complete | ⏳ Testing Pending

**Last Updated:** 2024-01-XX
