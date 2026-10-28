# 🎪 Venue Capacity Feature - Complete! ✅

## Overview
Venue capacity is now displayed throughout the app with "TBC" shown when capacity is not set.

---

## Changes Made

### 1. **Day Sheet Modal** (`src/components/maps/DaySheetModal.tsx`)

#### Updated Display:
- Label changed from "Capacity" to "Venue Capacity"
- Shows formatted number with thousand separators: `1,500`
- Shows **"TBC"** instead of "N/A" when capacity is missing
- Added placeholder in edit mode

```typescript
// View mode:
{show.venueCapacity ? show.venueCapacity.toLocaleString() : 'TBC'}

// Edit mode:
<Input
  type="number"
  placeholder="e.g., 500"
  ...
/>
```

---

### 2. **Map Marker Tooltip** (`src/components/maps/MarkerTooltip.tsx`)

#### New Capacity Section:
Added venue capacity display when hovering over map markers:

```typescript
{/* Venue Capacity */}
<div className="flex items-center gap-2 mb-3 px-3 py-2 bg-accent-purple/10 rounded">
  <Users className="h-4 w-4 text-accent-purple" />
  <div className="flex-1">
    <span className="text-xs text-text-secondary">Capacity: </span>
    <span className="text-sm font-semibold text-text-primary">
      {venueCapacity ? venueCapacity.toLocaleString() : 'TBC'}
    </span>
  </div>
</div>
```

**Features**:
- ✅ Users icon (purple)
- ✅ Shows formatted capacity: `1,500`
- ✅ Shows **"TBC"** when not set
- ✅ Positioned above fee information

---

### 3. **Map Show Interface** (`src/lib/maps/routeUtils.ts`)

#### Updated Show Type:
```typescript
export interface Show {
  id: string;
  date: string;
  venue_name: string;
  venue_address?: string | null;
  venue_lat?: number | null;
  venue_lng?: number | null;
  city?: string;
  state?: string;
  fee: number;
  venue_capacity?: number | null;  // ← Added
}
```

#### Updated Converter:
```typescript
export function convertShowForMap(show: AppShow): Show {
  return {
    // ...existing fields...
    venue_capacity: show.venueCapacity ?? null,  // ← Added
  };
}
```

---

### 4. **Backend API** (`backend/server.js`)

#### Updated Shows Response:
```javascript
const mapped = {
  ...camelShow,
  showDate: camelShow.date,
  venueName: camelShow.venueName,
  venueAddress: camelShow.venueAddress,
  venueCity: camelShow.city,
  venueCapacity: camelShow.capacity,  // ← Added mapping
  // ...other fields...
};
```

**Database Column**: `capacity` (already existed)
**Frontend Field**: `venueCapacity` (now properly mapped)

---

## Where Capacity is Displayed

### 1. **Day Sheet Modal** (Click map marker)
```
┌──────────────────────────────┐
│  Day Sheet - Show Info       │
├──────────────────────────────┤
│  Venue Name: The Crocodile   │
│  Venue Capacity: 1,150       │ ← Shows here
│  Address: ...                │
└──────────────────────────────┘
```

### 2. **Map Marker Tooltip** (Hover over marker)
```
┌──────────────────────────────┐
│ 📍 The Crocodile             │
│    2505 1st Ave, Seattle...  │
├──────────────────────────────┤
│ 👥 Capacity: 1,150           │ ← Shows here
│ 💵 $2,500                    │
│ 🧭 Next show: 495 miles      │
│ 🌤️ 52°F Partly Cloudy        │
└──────────────────────────────┘
```

### 3. **Create/Edit Show Form** (Already existed)
Form includes capacity input field.

---

## Display Logic

### When Capacity is Set:
```typescript
venueCapacity: 1500
Display: "1,500"  // Formatted with commas
```

### When Capacity is Not Set:
```typescript
venueCapacity: null | undefined
Display: "TBC"  // To Be Confirmed
```

### Examples:
| Database Value | Display |
|----------------|---------|
| `500` | `500` |
| `1500` | `1,500` |
| `10000` | `10,000` |
| `null` | `TBC` |
| `undefined` | `TBC` |

---

## Data Flow

```
1. Database (capacity column)
         ↓
2. Backend /api/shows
   - Maps capacity → venueCapacity
         ↓
3. Frontend Show type
   - venueCapacity?: number
         ↓
4. Display Components
   ├─→ DaySheetModal
   │   └─ Label: "Venue Capacity"
   │   └─ Value: "1,500" or "TBC"
   │
   └─→ MarkerTooltip
       └─ Label: "Capacity:"
       └─ Value: "1,500" or "TBC"
```

---

## Testing Checklist

### ✅ Day Sheet Modal
1. Navigate to tour page: http://localhost:3000/tours/[id]
2. Click "Routing" tab
3. Click on a map marker
4. **Verify**:
   - Label shows "Venue Capacity"
   - Shows capacity number (e.g., "1,500") if set
   - Shows "TBC" if not set

### ✅ Map Marker Tooltip
1. Navigate to tour page
2. Click "Routing" tab
3. **Hover** over any map marker (don't click)
4. **Verify**:
   - Capacity section appears with Users icon (👥)
   - Shows "Capacity: 1,500" if set
   - Shows "Capacity: TBC" if not set
   - Positioned above the fee section

### ✅ Edit Show Form
1. Navigate to tour page
2. Click "Shows" tab
3. Click edit button on a show
4. **Verify**:
   - Capacity field exists
   - Can enter/edit capacity
   - Saves correctly

---

## Example Venues

### With Capacity Set:
```
The Crocodile, Seattle
Capacity: 1,150

Whisky a Go Go, West Hollywood
Capacity: 500

DNA Lounge, San Francisco
Capacity: 450
```

### Without Capacity (TBC):
```
Third Room, Asheville
Capacity: TBC

Hop Springs, Murfreesboro
Capacity: TBC
```

---

## Styling Details

### Day Sheet Modal:
- **Font**: Regular weight
- **Format**: Thousand separators
- **Fallback**: "TBC" (not "N/A")

### Map Tooltip:
- **Background**: Purple tinted (`bg-accent-purple/10`)
- **Icon**: Users (👥) in purple
- **Label**: "Capacity:" in secondary text
- **Value**: Bold primary text
- **Format**: Thousand separators
- **Fallback**: "TBC"

---

## Database Schema

### Shows Table:
```sql
CREATE TABLE shows (
  id UUID PRIMARY KEY,
  venue_name VARCHAR(255),
  capacity INTEGER,  -- Venue capacity field
  -- ...other fields...
);
```

**Column**: `capacity`
**Type**: `INTEGER`
**Nullable**: `YES`
**Default**: `NULL`

---

## Files Modified

1. **`src/components/maps/DaySheetModal.tsx`**
   - Changed label to "Venue Capacity"
   - Updated fallback from "N/A" to "TBC"
   - Added number formatting with toLocaleString()
   - Added placeholder in edit mode

2. **`src/components/maps/MarkerTooltip.tsx`**
   - Added `venueCapacity` prop
   - Imported `Users` icon from lucide-react
   - Added capacity display section
   - Positioned above fee section

3. **`src/lib/maps/routeUtils.ts`**
   - Added `venue_capacity` to Show interface
   - Updated `convertShowForMap` to include capacity

4. **`src/components/maps/TourMap.tsx`**
   - Passed `venueCapacity` prop to MarkerTooltip

5. **`backend/server.js`**
   - Added `venueCapacity: camelShow.capacity` mapping
   - Ensures capacity is returned in API response

---

## Benefits

### For Tour Planning:
- ✅ **Quick capacity reference** when hovering over venues
- ✅ **See venue size** at a glance on the map
- ✅ **Compare capacities** across tour stops
- ✅ **Identify missing data** with "TBC" label

### For Users:
- ✅ **Consistent display** across all views
- ✅ **Clear indication** when capacity is unknown
- ✅ **Professional formatting** with thousand separators
- ✅ **Visual hierarchy** with icons and colors

---

## Future Enhancements (Optional)

### 1. **Capacity-based Venue Categorization**
```typescript
// Small: < 500
// Medium: 500-2000
// Large: > 2000
{venueCapacity < 500 ? '🏠 Small Venue' : '🏟️ Large Venue'}
```

### 2. **Revenue Projections**
```typescript
// If capacity and ticket price known:
maxRevenue = venueCapacity * ticketPrice
```

### 3. **Capacity Warnings**
```typescript
// Flag venues with missing capacity
{!venueCapacity && <Badge>⚠️ Missing Capacity</Badge>}
```

### 4. **Bulk Capacity Update**
Script to fetch capacity from venue databases/APIs.

---

## Status: ✅ COMPLETE

**Venue Capacity Feature**:
- ✅ Day Sheet modal displays capacity
- ✅ Map tooltip shows capacity on hover
- ✅ "TBC" shown when capacity is missing
- ✅ Number formatting with thousand separators
- ✅ Backend properly maps capacity field
- ✅ All data persists across app

---

**Date**: April 7, 2026
**Status**: ✅ **COMPLETE**
**Displays**: Day Sheet & Map Tooltip
**Fallback**: "TBC" (To Be Confirmed)
**Action**: Refresh browser to see capacity on map!

