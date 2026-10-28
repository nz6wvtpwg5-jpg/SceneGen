# Missing API Route Fix - Complete ✅

## Problem
The import wizard was failing to load existing tour shows with a 404 error:
```
GET http://localhost:3000/api/tours/9d21a757-70e4-4708-995b-b11057ce7fab/shows 404 (Not Found)
```

This caused:
- `existingShows` to remain empty
- The matching useEffect to never populate `showAddresses`
- The coordinate counter to show "0 of 29 venues have valid coordinates"
- Import summary stats to show all zeros

## Root Cause
The API route `/api/tours/[id]/shows/route.ts` **did not exist**!

The `Step3Validation.tsx` component was trying to fetch shows from this endpoint:
```typescript
const response = await fetch(`/api/tours/${tourId}/shows`, {
  credentials: 'include',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'X-Entity-Id': entityId,
  },
});
```

But the route handler was missing, so it returned 404.

## Solution
Created the missing API route: `/src/app/api/tours/[id]/shows/route.ts`

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authHeader = request.headers.get('authorization');
  const entityId = request.headers.get('x-entity-id');

  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tourId = params.id;
    const apiUrl = `${API_BASE_URL}/shows?tourId=${tourId}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (entityId) {
      headers['X-Entity-Id'] = entityId;
    }

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching tour shows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tour shows' },
      { status: 500 }
    );
  }
}
```

## How It Works

### Flow
1. User clicks "Add Shows from CSV" on tour details page
2. Import wizard loads with `?tourId=...` parameter
3. `Step3Validation` component mounts
4. First useEffect runs, calls `fetchExistingTourShows(tourId)`
5. **NEW**: API route `/api/tours/[id]/shows` handles the request
6. Backend returns shows for that tour
7. `setExistingShows(shows)` updates state
8. Second useEffect (matching) detects both `importData` and `existingShows`
9. Matching logic runs, populates `showAddresses` with correct indices
10. UI updates: "29 of 29 venues have valid coordinates" ✅

### API Request
```
GET /api/tours/9d21a757-70e4-4708-995b-b11057ce7fab/shows
Headers:
  Authorization: Bearer <token>
  X-Entity-Id: <entityId>
```

### API Response
```json
{
  "shows": [
    {
      "id": "...",
      "date": "2026-03-30",
      "venueName": "Lexington KY",
      "venue_address": "123 Main St",
      "venue_lat": 38.0406,
      "venue_lng": -84.5037,
      "city": "Lexington",
      "state": "KY",
      "show_type": "show"
    },
    // ... 26 more shows
  ],
  "total": 27
}
```

## Expected Behavior Now

### Console Output
```
📡 Fetching shows for tour 9d21a757-70e4-4708-995b-b11057ce7fab from http://localhost:3001/api/shows?tourId=...
✅ Fetched 27 shows for tour 9d21a757-70e4-4708-995b-b11057ce7fab
🔍 Matching existing shows to CSV shows...
   Existing shows: 27
   CSV shows: 29
   ✅ CSV show 0 matches existing show: Lexington KY
   ✅ CSV show 1 matches existing show: Murfreesboro TN
   ...
   ⚠️ CSV show 27 is NEW: New Venue on 2026-04-28
   ⚠️ CSV show 28 is NEW: Another Venue on 2026-04-29
   📍 Pre-filled 27 addresses
```

### UI Display
- Counter: "27 of 29 venues have valid coordinates"
- 27 shows with "Already Saved" badge and disabled inputs
- 2 new shows with editable inputs
- Import summary shows correct stats

## Files Created
- `/src/app/api/tours/[id]/shows/route.ts` - NEW API route handler

## Status: ✅ COMPLETE
The missing API route has been created. The import wizard will now correctly fetch existing tour shows and match them to CSV shows.

## Testing
1. Navigate to tour details page
2. Click "Edit Tour" → "Add Shows from CSV"
3. Upload CSV with existing shows
4. Verify console shows successful fetch
5. Verify "X of Y venues have valid coordinates" is accurate
6. Verify existing shows have "Already Saved" badge
