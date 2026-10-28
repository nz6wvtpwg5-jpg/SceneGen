# 🚀 Quick Start - Animated Route Wave

## What You'll See

When you load a tour with shows on the map:

1. **Regular markers** (1, 2, 3...) for all shows
2. **Animated waypoint** at today's show location:
   - Pulsing cyan ripples
   - Expands and contracts smoothly
   - Loops every 3 seconds
3. **Cyan route trail** from start to today's show
4. **Travelling wave dot** that:
   - Starts at the first show
   - Travels along the route
   - Arrives at today's show when waypoint peaks
   - Loops back to start

## Testing Steps

### 1. Open the App
```bash
# Make sure the app is running
npm run dev
```

### 2. Navigate to a Tour
- Go to a tour that has multiple shows
- Ensure at least one show has today's date

### 3. Hard Refresh (Clear Cache)
```
Mac:     Cmd + Shift + R
Windows: Ctrl + Shift + R
Linux:   Ctrl + Shift + R
```

### 4. Watch the Animation
- Look for today's show marker
- You should see:
  - ✓ Pulsing cyan ripples around the marker
  - ✓ Cyan line from start to today
  - ✓ Small cyan dot travelling along the line
  - ✓ Wave arrives when ripple is at maximum size

### 5. Verify No Errors
Open browser console (F12):
```
✓ No infinite render loop warnings
✓ No "Cannot find name 'Circle'" errors
✓ No "Cannot find name 'pulseScale'" errors
✓ Smooth 60fps animation
```

## What Changed vs. Old Version

| Old (Circle)              | New (Custom Animation)     |
|---------------------------|----------------------------|
| Single pulsing circle     | Multi-layer ripple effect  |
| Google Maps Circle API    | Custom SVG overlays        |
| No route visualization    | Animated route trail       |
| Static markers only       | Travelling wave + markers  |
| Not synced                | Perfectly synchronized     |
| Browser cache issues      | No cache issues (new code) |

## Customization Options

### Animation Speed
```typescript
// In TourMap.tsx, line ~115
const duration = 3000; // Change to speed up/slow down
```

### Colors
```typescript
// Cyan: #06b6d4
// Change all instances to your preferred color
```

### Sizes
```typescript
// Waypoint outer ripple: 20 → 40 pixels
r={20 + easedPulse * 20}

// Waypoint inner ripple: 15 → 25 pixels
r={15 + easedPulse * 10}

// Wave dot: 6 pixels
r="6"

// Route trail width: 6 pixels
strokeWeight: 6
```

### Opacity
```typescript
// Waypoint outer: 0.6 → 0.2
opacity={0.6 - easedPulse * 0.4}

// Waypoint inner: 0.3 → 0.1
fillOpacity={0.3 - easedPulse * 0.2}

// Route trail: 0.4 (static)
strokeOpacity: 0.4
```

## Troubleshooting

### I still see the old cyan circle
**Solution**: Hard refresh (Cmd+Shift+R) to clear browser cache

### No animation appears
**Check**:
- Is there a show with today's date?
- Open console, look for "Today's show found: ..."
- If "NONE", no show has today's date

### Wave doesn't appear
**Check**:
- Are routes loaded? (Need 2+ shows with coordinates)
- Console should show "Successfully loaded X route segments"
- If route error, check Google Maps API setup

### Animation is stuttering
**Check**:
- Console for infinite render loop warnings
- Browser performance (should be smooth at 60fps)
- Try closing other tabs/apps

### Wave position is wrong
**Check**:
- `todayShowIndex` value in console
- `animatedPath.length` (should be > 0)
- Route segments are loading correctly

## Code Location

All changes are in:
```
/src/components/maps/TourMap.tsx
```

Key sections:
- Lines 60-144: Animation system setup
- Lines 146-210: Route path calculation
- Lines 612-668: Waypoint marker rendering
- Lines 671-684: Route trail rendering
- Lines 687-730: Wave dot rendering

## Performance Notes

✓ **Memoized calculations** - No unnecessary re-renders
✓ **Single animation loop** - Efficient requestAnimationFrame
✓ **No state in render** - Clean component lifecycle
✓ **Stable callbacks** - useCallback for functions
✓ **60fps smooth** - Optimized for performance

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify today's date matches a show date
3. Hard refresh to clear cache
4. Check MAP_CIRCLE_ISSUE.txt for common issues
5. Review ANIMATED_ROUTE_WAVE_COMPLETE.md for details

---

**Status**: ✅ Ready to test
**Next**: Open browser, hard refresh, watch the magic! 🎬
