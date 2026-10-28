# Backend API Adapter Fix

## Problem
The frontend and backend had mismatched schemas, preventing show creation:

**Frontend sends (CreateShowInput):**
- `artistEntityId`, `promoterEntityId`
- `showDate`, `showTime`, `doorsTime`
- `venueCity`, `venueState`, `venueCountry`
- `setLength`, `currency`, `dealType`
- `contactName`, `contactPhone`, `contactEmail`

**Backend expects (old schema):**
- `entity_id`, `tour_id`
- `date`, `startTime`, `doorTime`
- `city`, `state`, `country`
- `fee`, `guaranteedFee`, `backendDeal`
- `promoterName`, `promoterEmail`, `promoterPhone`

## Solution
Created an **API adapter** in `/src/app/api/shows/route.ts` that transforms the frontend data structure to match the backend schema.

### Field Mapping

| Frontend Field | Backend Field | Notes |
|---|---|---|
| `showDate` | `date` | Required |
| `showTime` | `startTime` | Default: '20:00' |
| `doorsTime` | `doorTime` | Default: '19:00' |
| `venueName` | `venueName` | Default: 'TBD' |
| `venueAddress` | `venueAddress` | Default: 'TBD' |
| `venueCity` | `city` | Default: 'TBD' |
| `venueState` | `state` | Default: '' |
| `venueCountry` | `country` | Default: 'USA' |
| `venueCapacity` | `capacity` | Optional |
| `guarantee` | `fee` & `guaranteedFee` | Optional |
| `dealType` | `backendDeal` | Default: 'guarantee' |
| `advanceTicketPrice` | `ticketPrice` | Falls back to `doorTicketPrice` |
| `contactName` | `promoterName` | Default: 'TBD' |
| `contactEmail` | `promoterEmail` | Default: 'noreply@scenegen.com' |
| `contactPhone` | `promoterPhone` | Default: 'TBD' |
| `notes` | `notes` | Optional |
| `tourId` | `tourId` | Optional |

### Not Yet Mapped
The following frontend fields are not yet stored in the backend:
- `artistEntityId`, `promoterEntityId` (counterparty info)
- `setLength` (show duration)
- `currency` (ISO code)
- `doorSplitPercentage` (for door split deals)
- `technicalRequirements`

These fields will need backend schema updates to persist.

## How It Works

1. **Frontend** sends CreateShowInput to `/api/shows`
2. **API adapter** transforms the data:
   ```typescript
   const backendPayload: any = {
     date: body.showDate,
     startTime: body.showTime || '20:00',
     city: body.venueCity || 'TBD',
     // ... etc
   };
   ```
3. **Backend** receives transformed data and saves to database
4. **Response** returned to frontend

## Testing
After this fix:
1. ✅ "Create Show" button is enabled when appropriate
2. ✅ Shows can be created with minimal data (progressive entry)
3. ✅ Default values prevent validation errors
4. ✅ Data is transformed to match backend expectations

## Next Steps (Backend Schema Update)
To fully support the new show structure, the backend needs:

1. **Database migration** to add missing columns:
   - `artist_entity_id`, `promoter_entity_id`
   - `set_length`
   - `currency`
   - `door_split_percentage`
   - `technical_requirements`
   - Update `doors_time`, `show_time` column names

2. **API endpoint updates** to accept new field names

3. **Remove adapter** once backend is updated

## Files Changed
- `/src/app/api/shows/route.ts` - Added transformation logic
- `/src/components/shows/CreateShowForm.tsx` - Fixed button disabled logic
- `/src/types/show.ts` - Made `setLength` optional

## Status
**WORKING**: Shows can now be created from calendar events with the current backend.
**PENDING**: Backend schema update for full feature support.
