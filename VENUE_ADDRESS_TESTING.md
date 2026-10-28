# Testing Venue Address Feature

## 🧪 Quick Test Guide

### Test 1: Import with Venue Addresses

1. **Navigate** to `http://localhost:3000/import`
2. **Upload** your tour CSV file
3. **Map Fields** as usual
4. **On Validation Screen**, scroll to "Venue Addresses" section
5. **For the first show**:
   - Type the venue name in the search box
   - Wait for Google Places suggestions
   - Click on a suggestion from the dropdown
   - **Verify**: Green checkmark appears
6. **Repeat** for 2-3 more shows
7. **Check Progress**: Should show "3 of 29 venues have addresses" (or similar)
8. **Continue** with tour settings and complete import
9. **Result**: Import should succeed

### Test 2: View Route on Map

After completing Test 1:

1. **Click** "View Tour Details" button
2. **Click** "Route" tab in the modal
3. **Verify**:
   - Map loads successfully
   - Shows with addresses appear as numbered markers
   - Clicking markers shows info windows with:
     - Venue name
     - Full address
     - Date
     - Fee
   - If <25 shows: Single blue route connecting them
   - If >25 shows: Multiple colored route segments

### Test 3: Import Without Addresses (Optional)

1. **Navigate** to `http://localhost:3000/import`
2. **Upload** CSV
3. **Map Fields**
4. **On Validation Screen**, scroll past "Venue Addresses" WITHOUT entering any
5. **Complete** import
6. **Open** tour details → Route tab
7. **Verify**: Message displays "No shows with valid coordinates found"

### Test 4: Partial Addresses

1. **Import** a tour
2. **Enter addresses** for only 5 out of 29 shows
3. **Complete** import
4. **Open** tour → Route tab
5. **Verify**:
   - Only 5 markers appear on map
   - Route connects only those 5 shows
   - No errors

## 🔍 What to Look For

### ✅ Success Indicators:

1. **Google Places Search Works**
   - Typing shows dropdown suggestions
   - Suggestions are relevant to search term
   - Clicking suggestion populates the field

2. **Checkmarks Appear**
   - Green checkmark shows after selecting address
   - Counter updates: "5 of 29 venues have addresses"

3. **Import Succeeds**
   - No errors during import
   - Success page shows correct counts
   - "View Tour Details" button works

4. **Map Displays Correctly**
   - Markers appear at correct locations
   - Info windows show full address
   - Routes connect markers in date order

### ❌ Issues to Watch For:

1. **Google Maps API Key**
   - Error: "Loading Google Maps..."
   - Fix: Check `.env.local` has `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

2. **Places Not Loading**
   - Error: Input field disabled
   - Fix: Verify Places API is enabled in Google Cloud Console

3. **Addresses Not Saving**
   - Issue: Map shows "No coordinates"
   - Check: Console logs show "shows with addresses: X"
   - Check: Backend received venue data

## 📊 Sample Test Data

### Good Test Venues (Easy to Find):

1. **Madison Square Garden** - New York, NY
2. **The Fillmore** - San Francisco, CA
3. **Red Rocks Amphitheatre** - Morrison, CO
4. **House of Blues** - Chicago, IL
5. **The Ryman Auditorium** - Nashville, TN

### Expected Results:

```javascript
// Console should show:
🔍 handleStartImport - shows with addresses: 5

// Database should have:
venue_address: "4 Pennsylvania Plaza, New York, NY 10001"
venue_lat: 40.7505
venue_lng: -73.9934
```

## 🐛 Troubleshooting

### Issue: "Cannot find module @/components/ui/input"
**Cause**: TypeScript cache issue
**Fix**:
```bash
# In VS Code:
Cmd+Shift+P → "TypeScript: Restart TS Server"

# Or restart dev server:
# Stop server (Ctrl+C) then:
npm run dev
```

### Issue: Autocomplete doesn't show suggestions
**Check**:
1. `.env.local` has the API key
2. Places API enabled in Google Cloud Console
3. No console errors about API key
4. Browser has internet connection

### Issue: Map doesn't display route
**Check**:
1. At least 2 shows have addresses
2. Console shows "shows with addresses: X" where X > 1
3. Directions API enabled in Google Cloud Console
4. No errors in browser console

### Issue: Addresses not saving to database
**Check**:
1. Backend logs show venue data received
2. Database migration ran successfully
3. `venue_address`, `venue_lat`, `venue_lng` columns exist
4. Backend server.js updated with new fields

## 📝 Manual Database Check

After importing, verify data was saved:

```sql
-- Check if addresses were saved
SELECT
  id,
  venue_name,
  venue_address,
  venue_lat,
  venue_lng,
  date
FROM shows
WHERE tour_id = 'your_tour_id'
ORDER BY date;

-- Should show:
-- venue_address: "4 Pennsylvania Plaza, New York, NY 10001" (not null)
-- venue_lat: 40.7505 (not null)
-- venue_lng: -73.9934 (not null)
```

## ✨ Expected User Experience

### Import Flow:
```
1. Upload CSV ✓
2. Map Fields ✓
3. Validation
   ├─ Summary: 29 valid shows ✓
   ├─ Venue Addresses:
   │  ├─ Madison Square Garden [Search...] ✓
   │  ├─ The Fillmore [Search...] ✓
   │  └─ ... (27 more)
   │  Progress: 2 of 29 venues have addresses
   ├─ Tour Settings: Create "USA Tour Mar 2026" ✓
   └─ Summary: $145,000 revenue
4. Import ✓
5. Success! View Tour Details ✓
```

### Map View:
```
Route Tab:
┌─────────────────────────────────┐
│  Google Map                      │
│                                  │
│    1 ← Madison Square Garden    │
│     \                            │
│      \                           │
│       2 ← The Fillmore          │
│                                  │
│  [Distance: 2,908 miles]        │
└─────────────────────────────────┘
```

## 🎯 Success Criteria

- [x] Can search for venues using Google Places
- [x] Selecting suggestion populates address field
- [x] Checkmark appears when address is set
- [x] Progress counter updates correctly
- [x] Import succeeds with addresses
- [x] Database stores lat/lng correctly
- [x] Map displays markers at correct locations
- [x] Route connects shows in order
- [x] Info windows show full address

## 📞 If You Need Help

1. Check browser console for errors
2. Check backend logs for API errors
3. Verify `.env.local` configuration
4. Review `VENUE_ADDRESS_IMPLEMENTATION.md`
5. Review `GOOGLE_MAPS_IMPLEMENTATION_PLAN.md`

---

**Ready to Test!** 🚀

Start with Test 1, then proceed through the others.
