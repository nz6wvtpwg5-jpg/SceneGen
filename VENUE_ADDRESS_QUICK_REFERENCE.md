# 🗺️ Venue Address Collection - Quick Reference

## ✅ What's Working

| Component | Status | Location |
|-----------|--------|----------|
| Database Schema | ✅ Ready | `venue_address`, `venue_lat`, `venue_lng` in `shows` table |
| Backend API | ✅ Ready | `/api/import/execute` accepts and saves venue fields |
| PlacesAutocomplete | ✅ Ready | Google Places integration for address search |
| Step3Validation | ✅ Ready | UI for collecting addresses during import |
| Data Flow | ✅ Ready | Frontend → Backend → Database |
| Map Visualization | ✅ Ready | TourMap displays routes based on coordinates |

## 🎯 How It Works

### User Flow
```
1. Upload CSV with show data
2. Map CSV fields (date, city, venue, fee)
3. ⭐ Enter venue address for each show (new step!)
4. Select tour settings
5. Import data
6. View tour with map and routes
```

### Address Entry (Step 3)
```
For each show:
  1. Click in address field
  2. Type venue address
  3. ⚡ MUST click on dropdown suggestion
  4. ✓ Green checkmark + coordinates appear
  5. Counter updates: "X of Y venues have valid coordinates"
```

### Visual Feedback
- **Before selection:** Plain white card
- **After selection:**
  - 🟢 Green border
  - ✓ Checkmark with "Verified"
  - Coordinates: `40.7197, -73.9366`
  - Counter increments

## 🔍 Debugging

### Check #1: Frontend Console
```javascript
📍 Address selected for show 0: { address: "...", lat: 40.7197, lng: -73.9366 }
🗺️  Total shows with coordinates: 5 / 5
```

### Check #2: Network Request
```json
{
  "shows": [{
    "venue_address": "319 Frost St, Brooklyn, NY 11222, USA",
    "venue_lat": 40.7197,
    "venue_lng": -73.9366
  }]
}
```

### Check #3: Database
```bash
./backend/verify-venue-import.sh
```

Expected:
```
with_coordinates | 5  ← Should match # of addresses entered
```

## ⚠️ Common Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| No dropdown suggestions | API key missing | Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to `.env.local` |
| No checkmark after typing | Didn't click suggestion | Must select from dropdown, not just type |
| Coordinates are NULL | Addresses not properly selected | Use dropdown suggestions, look for green checkmark |
| Map shows no routes | < 2 venues with coordinates | Enter at least 2 addresses |

## 📋 Quick Test

1. **Import a test tour:**
   ```bash
   http://localhost:3000/import
   ```

2. **Enter addresses:**
   - Type "Brooklyn Steel 319 Frost"
   - Click dropdown suggestion
   - Look for green checkmark ✓

3. **Verify in console:**
   ```
   🗺️ Total shows with coordinates: 1 / 5
   ```

4. **Check database:**
   ```bash
   cd backend
   ./verify-venue-import.sh
   ```

5. **View map:**
   ```bash
   http://localhost:3000/tours
   ```

## 🚀 Files Modified

### Frontend
- `/src/app/import/components/Step3Validation.tsx` - Address collection UI
- `/src/components/maps/PlacesAutocomplete.tsx` - Google Places input
- `/src/components/maps/TourMap.tsx` - Map visualization
- `/src/lib/maps/routeUtils.ts` - Route segmentation

### Backend
- `/backend/server.js` - Import endpoint (lines 2914-2933)
- `/backend/migrations/add_venue_address_fields.sql` - Schema migration

### Documentation
- `VENUE_ADDRESS_DEBUG_GUIDE.md` - Detailed debugging guide
- `VENUE_ADDRESS_MANUAL_TEST.md` - Step-by-step testing
- `VENUE_ADDRESS_QUICK_REFERENCE.md` - This file

## 📞 Need Help?

1. Run verification: `./backend/verify-venue-import.sh`
2. Check browser console for 📍 and 🗺️ logs
3. Inspect network request payload
4. Query database for recent shows
5. Read `VENUE_ADDRESS_DEBUG_GUIDE.md` for detailed troubleshooting

## ✨ Next Steps

After testing:
- [ ] Test with real tour data
- [ ] Verify map displays correctly
- [ ] Consider requiring addresses (optional enhancement)
- [ ] Add bulk address entry (optional enhancement)
- [ ] Document user workflow
