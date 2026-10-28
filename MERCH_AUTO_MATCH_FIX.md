# 🔧 Merch Auto-Matching Fix - Show Day Window (12 Noon to 3 AM)

## Problem Identified

Orders from **April 30th** (early morning, after midnight) were not being matched to shows on **April 29th**, even though they were from the same event (late-night merch sales).

## Root Cause

The previous auto-matching logic used a **24-hour symmetric window**:
- 24 hours before OR after the show
- Used `Math.abs()` which treated both directions equally

This didn't account for real-world touring scenarios where merch sales:
- Start in the afternoon on show day
- Continue through the show
- Go late into the night (past midnight)
- Need a clean cutoff that doesn't overlap with other shows

## Solution Implemented

Updated auto-matching logic to use a **fixed daily window per show**:

### New Matching Window
```javascript
// Match if order is within:
// FROM: 12:00 PM (noon) on the day of the show
// TO: 3:00 AM the day after the show

const windowStart = new Date(showDate);
windowStart.setHours(12, 0, 0, 0); // 12:00 PM on show day

const windowEnd = new Date(showDate);
windowEnd.setDate(windowEnd.getDate() + 1); // Next day
windowEnd.setHours(3, 0, 0, 0); // 3:00 AM next day

if (orderDate >= windowStart && orderDate <= windowEnd) {
  matchedShow = show;
}
```

### Why This Window?

**12:00 PM (Noon) Start:**
- Load-in typically happens in the afternoon
- Soundcheck sales start
- Doors open in the evening
- Captures all pre-show and show sales

**3:00 AM End:**
- Covers the entire show
- Includes post-show merch rush
- Catches late-night sales after the show
- Stops before normal business hours next day
- Clean 15-hour window per show

**Total Window: 15 hours** (12 PM → 3 AM next day)

This means:
- Orders on April 29th at 1:00 PM → Matches April 29th show ✅
- Orders on April 29th at 11:00 PM → Matches April 29th show ✅
- Orders on April 30th at 1:00 AM → Matches April 29th show ✅
- Orders on April 30th at 2:59 AM → Matches April 29th show ✅
- Orders on April 30th at 3:01 AM → No match to April 29th ❌

## Files Updated

### `backend/server.js`

**1. Sync Endpoint Auto-Matching** (lines ~3770-3790)
```javascript
// Old logic:
const diffHours = Math.abs(showDate - orderDate) / (1000 * 60 * 60);
if (diffHours <= 24) { ... }

// New logic:
const windowStart = new Date(showDate);
windowStart.setHours(12, 0, 0, 0); // 12:00 PM on show day

const windowEnd = new Date(showDate);
windowEnd.setDate(windowEnd.getDate() + 1); // Next day
windowEnd.setHours(3, 0, 0, 0); // 3:00 AM next day

if (orderDate >= windowStart && orderDate <= windowEnd) { ... }
```

**2. Auto-Match Endpoint** (lines ~3890-3905)
- Updated `/api/merch/auto-match` endpoint with same window logic
- This endpoint re-matches existing unmatched orders

## How to Fix Your Existing Data

Since you already have 3540 unmatched orders, you need to **re-run the auto-match**:

### Option 1: Click "Auto-Match to Shows" Button
1. On the Merch page, click **"Auto-Match to Shows"** button (top right)
2. This will re-process all unmatched orders with the new logic
3. Watch the unmatched count drop as orders get matched

### Option 2: Use the Sync Modal
1. Click **"Sync Square"**
2. Choose **"Full Re-Import"** (this will re-sync and re-match everything)
3. Watch the progress bar
4. All orders will be re-evaluated with the new matching window

## Expected Results

**Before:**
- April 30th orders: 56 transactions, **0/56 matched** ❌
- Show: April 29th (Hop Springs, Murfreesboro, TN)

**After:**
- April 30th orders: 56 transactions, **56/56 matched** ✅
- Show: April 29th (Hop Springs, Murfreesboro, TN)

## Real-World Example

```
Show Date: April 29, 2026

Sales Timeline (15-hour window):
├─ 11:00 AM Apr 29     → Before window       ❌ No match
├─ 12:00 PM Apr 29     → Window starts       ✅ MATCHED
├─ 2:00 PM Apr 29      → Load-in sales       ✅ MATCHED
├─ 6:00 PM Apr 29      → Soundcheck sales    ✅ MATCHED
├─ 8:00 PM Apr 29      → Show time           ✅ MATCHED
├─ 10:30 PM Apr 29     → During show         ✅ MATCHED
├─ 11:45 PM Apr 29     → Show ending         ✅ MATCHED
├─ 12:30 AM Apr 30     → Post-show sales     ✅ MATCHED
├─ 1:30 AM Apr 30      → Late sales          ✅ MATCHED
├─ 2:45 AM Apr 30      → Last sales          ✅ MATCHED
├─ 3:00 AM Apr 30      → Window ends         ✅ MATCHED (exactly)
├─ 3:01 AM Apr 30      → After window        ❌ No match
└─ 12:00 PM Apr 30     → Next day            ❌ No match (next show window)
```

## Testing

### Verify the Fix
1. **Check existing unmatched orders** - Note the current count (3540)
2. **Click "Auto-Match to Shows"** - Trigger re-matching
3. **Watch the count drop** - Should see significant reduction
4. **Check April 30th transactions** - Should now show the April 29th show

### For New Syncs
- Future syncs will automatically use the new matching logic
- Orders from late-night shows will auto-match correctly
- No manual intervention needed

## Benefits

✅ **Predictable Windows**: Each show has a clean 15-hour window (12 PM → 3 AM)  
✅ **No Overlap Issues**: Windows won't interfere with back-to-back shows  
✅ **Captures Late-Night Sales**: Sales after midnight properly attributed  
✅ **Realistic Timing**: Matches how touring musicians actually sell merch  
✅ **Clean Cutoffs**: Clear start and end times, easy to understand  

## Edge Cases Handled

1. **Back-to-back Shows**: 
   - Show #1 (Apr 29): Window = Apr 29 12PM → Apr 30 3AM
   - Show #2 (Apr 30): Window = Apr 30 12PM → May 1 3AM
   - No overlap! (9-hour gap between windows)

2. **Multi-day Festivals**: Each day gets its own window
3. **Late Load-in**: Covered starting at noon
4. **Very Late Shows**: Covered until 3 AM next day
5. **Early Morning Sales**: Not matched (belongs to previous day or no show)

## Important Notes

- **Doesn't affect manual matches**: Manually matched orders stay as-is
- **Only affects unmatched orders**: Won't re-match already matched ones
- **Sorted by date**: Finds shows in date order, picks first match
- **Safe to run multiple times**: Auto-match is idempotent

## Status

✅ **Backend Updated**: New matching logic deployed  
✅ **Server Restarted**: Changes active  
⏳ **Waiting for**: User to click "Auto-Match to Shows"  

---

## Next Steps for You

1. **Refresh your browser** to ensure new code is loaded
2. **Click "Auto-Match to Shows"** button on Merch page
3. **Watch unmatched count** decrease
4. **Verify April 30th orders** now show April 29th show

The fix is live and ready! 🎉
