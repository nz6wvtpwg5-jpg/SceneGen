# 🎬 Animated Route Wave - Visual Guide

## Animation Timeline (3 second loop)

```
TIME    WAVE POSITION          WAYPOINT SIZE         SYNC STATUS
────────────────────────────────────────────────────────────────
0.0s    ● Start (1st show)     ◯ Minimum (r=20)     ✓ Synced
0.5s    ● 25% progress         ◯ Growing            ✓ Synced
1.0s    ● 50% progress         ◯ Growing            ✓ Synced
1.5s    ● Today's show! ●      ◉ MAXIMUM (r=40)     ★ PEAK!
2.0s    ● 75% back             ◯ Shrinking          ✓ Synced
2.5s    ● Almost start         ◯ Shrinking          ✓ Synced
3.0s    ● Start (reset)        ◯ Minimum (r=20)     ✓ Loop
```

## Visual Components

### 1. Waypoint Marker (at today's show location)
```
     Outer Ripple
    ╭─────────╮
   ╱           ╲    ← Expands 20→40px
  │   Inner    │   ← Fades opacity
  │  ╭─────╮   │
  │ │ ◉◉◉◉ │   │   ← Pulsing cyan
  │  ╰─────╯   │
   ╲           ╱
    ╰─────────╯
```

### 2. Route Trail (static cyan line)
```
Start → → → → → → → → → → → TODAY
      Cyan polyline (opacity: 0.4)
```

### 3. Travelling Wave (moving dot)
```
Start ●--------------------→ TODAY
      ↑
      Wave travels along route
      (loops every 3 seconds)
```

## Code Structure

```typescript
┌─────────────────────────────────────────┐
│ Master Clock: t (0 → 1, loops)         │
└─────────────────┬───────────────────────┘
                  │
      ┌───────────┴───────────┐
      ↓                       ↓
┌──────────────┐    ┌──────────────────┐
│ pulse        │    │ routeProgress    │
│ (sine wave)  │    │ (linear)         │
└──────┬───────┘    └────────┬─────────┘
       ↓                     ↓
┌──────────────┐    ┌──────────────────┐
│ easedPulse   │    │ wavePosition     │
│ (smooth)     │    │ (lat/lng)        │
└──────┬───────┘    └────────┬─────────┘
       ↓                     ↓
┌──────────────┐    ┌──────────────────┐
│ Waypoint     │    │ Wave Dot         │
│ SVG ripples  │    │ SVG circle       │
└──────────────┘    └──────────────────┘
```

## Animation Math

### Pulse (Waypoint)
```typescript
pulse = sin(t * 2π) * 0.5 + 0.5
// Result: 0 → 1 → 0 (smooth sine wave)

easedPulse = pulse < 0.5
  ? 2 * pulse²
  : 1 - (-2 * pulse + 2)² / 2
// Result: ease-in-out curve

radius = 20 + easedPulse * 20
// Result: 20px → 40px → 20px
```

### Wave (Route Position)
```typescript
routeProgress = t
// Result: 0 → 1 (linear)

wavePosition = getPointAtProgress(animatedPath, t)
// Result: interpolated lat/lng along route
```

## Color Palette

```
Cyan (#06b6d4)
├─ Wave dot:      Fill, solid
├─ Wave ring:     Stroke, opacity 0.6
├─ Route trail:   Stroke, opacity 0.4
├─ Waypoint outer: Stroke, opacity 0.6→0.2
└─ Waypoint inner: Fill, opacity 0.3→0.1
```

## Performance Optimization

```typescript
✓ useMemo for expensive calculations
  └─ pulse, easedPulse, routeProgress
  └─ animatedPath, wavePosition

✓ useCallback for stable function references
  └─ getRoutePointsToToday
  └─ getPointAtProgress

✓ Single requestAnimationFrame loop
  └─ Updates t once per frame
  └─ All animations derive from t

✓ No state updates in render
  └─ No infinite loops
  └─ Clean component lifecycle
```

## Synchronization Key

The **magic** of synchronization:

```
When t = 0.5:
  ├─ easedPulse = 1.0 (waypoint at MAXIMUM)
  └─ routeProgress = 0.5 (wave at HALFWAY)

If wave reaches TODAY when routeProgress = 1.0,
then at t = 0.5, wave is at 50% progress.

BUT we want wave to arrive when waypoint peaks!

Solution: Adjust route to end at TODAY's show,
so wave reaches destination when t = 0.5,
which is exactly when easedPulse peaks at 1.0!
```

## Troubleshooting

### Wave doesn't reach today's show
- Check `todayShowIndex` calculation
- Verify `getRoutePointsToToday` includes correct segments
- Log `animatedPath.length` to ensure path exists

### Animation stutters
- Check for console errors
- Verify no infinite render loops
- Check browser dev tools Performance tab

### Wave and waypoint out of sync
- Verify both use same `t` value
- Check animation duration matches (3000ms)
- Ensure no separate animation loops

### No animation at all
- Check `todayShow` is found (not null)
- Verify `routes` are loaded
- Check `animatedPath.length > 0`

## Browser Cache Note

If you see the old cyan circle:
1. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. Clear cache and reload
3. Open in incognito/private window

---

**Visual Style**: Cyan (#06b6d4) • Smooth ease-in-out • 3s loop
**Performance**: 60fps • Memoized • Single animation clock
**Sync**: Wave arrives ← → Waypoint peaks ★
