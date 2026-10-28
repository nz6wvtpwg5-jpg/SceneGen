# ✅ Merch Auto-Match Window: 12 Noon → 3 AM

## Summary

Updated the merch auto-matching logic to use a **fixed daily window per show**:

### Matching Window
- **START**: 12:00 PM (noon) on the day of the show
- **END**: 3:00 AM the day after the show
- **DURATION**: 15 hours total

### Why This Works

```
Show: April 29, 2026

Window: April 29 @ 12:00 PM → April 30 @ 3:00 AM

✅ April 29 @ 1:00 PM   → Matched (load-in)
✅ April 29 @ 8:00 PM   → Matched (show time)
✅ April 29 @ 11:30 PM  → Matched (during show)
✅ April 30 @ 12:30 AM  → Matched (post-show)
✅ April 30 @ 2:30 AM   → Matched (late sales)
❌ April 30 @ 3:01 AM   → NOT matched (window closed)
❌ April 30 @ 12:00 PM  → NOT matched (next show's window)
```

## Benefits

1. **No Overlap**: Back-to-back shows won't conflict (9-hour gap)
2. **Predictable**: Same window for every show
3. **Complete**: Captures all show-related sales
4. **Clean**: Clear start and end times

## What You Need to Do

Click **"Auto-Match to Shows"** button on the Merch page to re-process your existing orders with this new logic.

This will match those April 30th early morning orders to the April 29th show! 🎯
