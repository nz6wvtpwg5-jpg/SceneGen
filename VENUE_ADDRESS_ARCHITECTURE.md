# Venue Address System - Visual Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CSV IMPORT FLOW                          │
└─────────────────────────────────────────────────────────────────┘

Step 1: Upload          Step 2: Mapping        Step 3: Validation    Step 4: Import
┌──────────┐           ┌──────────┐           ┌──────────────┐      ┌──────────┐
│          │           │          │           │              │      │          │
│  Choose  │  ────>    │   Map    │  ────>    │   Enter      │ ──>  │  Import  │
│   CSV    │           │  Fields  │           │  Addresses   │      │   Data   │
│          │           │          │           │  (NEW!)      │      │          │
└──────────┘           └──────────┘           └──────────────┘      └──────────┘
                                                     │
                                                     │
                                              ┌──────▼────────┐
                                              │ PlacesAutocom │
                                              │    plete      │
                                              └───────────────┘
```

## Component Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js)                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ ImportWizard.tsx                                                │ │
│  │  - Manages overall import flow                                  │ │
│  │  - Handles state transitions                                    │ │
│  │  - Calls /api/import/execute                                    │ │
│  └───────────────────────┬─────────────────────────────────────────┘ │
│                          │                                            │
│                          ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Step3Validation.tsx                                             │ │
│  │  - Shows validation results                                     │ │
│  │  - Collects venue addresses ⭐                                  │ │
│  │  - Manages showAddresses state                                  │ │
│  │  - Merges addresses into importData                             │ │
│  └───────────────────────┬─────────────────────────────────────────┘ │
│                          │                                            │
│                          ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ PlacesAutocomplete.tsx                                          │ │
│  │  - Google Maps API integration                                  │ │
│  │  - Address search with autocomplete                             │ │
│  │  - Returns: address, lat, lng                                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

                                  │ HTTP POST
                                  │ /api/import/execute
                                  ▼

┌────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (Express)                             │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ POST /api/import/execute                                        │ │
│  │  - Receives shows, budgets, tour                                │ │
│  │  - Validates entity                                             │ │
│  │  - Creates tour (if new)                                        │ │
│  │  - Inserts shows with venue fields ⭐                           │ │
│  │  - Inserts budgets and line items                               │ │
│  └───────────────────────┬─────────────────────────────────────────┘ │
│                          │                                            │
│                          ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ SQL INSERT                                                      │ │
│  │   INSERT INTO shows (                                           │ │
│  │     venue_name,                                                 │ │
│  │     venue_address,  ← New field                                │ │
│  │     venue_lat,      ← New field                                │ │
│  │     venue_lng,      ← New field                                │ │
│  │     ...                                                         │ │
│  │   ) VALUES (...)                                                │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

                                  │
                                  ▼

┌────────────────────────────────────────────────────────────────────────┐
│                        DATABASE (PostgreSQL)                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  shows table                                                          │
│  ┌─────────────────┬──────────────┬──────────┐                       │
│  │ Column          │ Type         │ Nullable │                       │
│  ├─────────────────┼──────────────┼──────────┤                       │
│  │ id              │ uuid         │ NOT NULL │                       │
│  │ venue_name      │ varchar(255) │ NOT NULL │                       │
│  │ venue_address   │ text         │ NOT NULL │ ⭐ New                │
│  │ venue_lat       │ decimal(10,8)│ YES      │ ⭐ New                │
│  │ venue_lng       │ decimal(11,8)│ YES      │ ⭐ New                │
│  │ city            │ varchar(100) │ NOT NULL │                       │
│  │ state           │ varchar(100) │ YES      │                       │
│  │ country         │ varchar(100) │ YES      │                       │
│  │ ...             │ ...          │ ...      │                       │
│  └─────────────────┴──────────────┴──────────┘                       │
│                                                                        │
│  Indexes:                                                             │
│    - idx_shows_coordinates (venue_lat, venue_lng) ⭐                  │
│    - idx_shows_tour_id (tour_id)                                     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

                                  │
                                  ▼

┌────────────────────────────────────────────────────────────────────────┐
│                       MAP VISUALIZATION                                │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  TourDetailsModal.tsx → TourMap.tsx                                   │
│                                                                        │
│  1. Fetch shows for tour                                             │
│  2. Filter shows with coordinates (venue_lat && venue_lng)           │
│  3. Segment into route batches (max 25 stops per segment)            │
│  4. Render Google Map:                                               │
│     - Markers for each venue                                         │
│     - DirectionsRenderer for each segment                            │
│     - InfoWindows with venue details                                 │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌─────────────┐
│   User      │
│  Actions    │
└──────┬──────┘
       │
       │ 1. Uploads CSV
       ▼
┌─────────────────┐
│  Step1Upload    │
│  (File Upload)  │
└──────┬──────────┘
       │
       │ 2. Parses CSV
       ▼
┌─────────────────┐
│  Step2Mapping   │
│  (Field Map)    │
└──────┬──────────┘
       │
       │ 3. Validates data
       ▼
┌──────────────────────┐
│  Step3Validation     │◄────────┐
│                      │         │
│  ┌────────────────┐ │         │
│  │ For each show: │ │         │
│  │                │ │         │ Google Places API
│  │  [Input field] │─┼─────────┤ (address search)
│  │      ▼         │ │         │
│  │   onChange()   │ │         │
│  │      ▼         │ │         │
│  │ showAddresses  │ │
│  │ { 0: {...},    │ │
│  │   1: {...} }   │ │
│  └────────────────┘ │
│                      │
│  On "Start Import":  │
│                      │
│  shows.map(show =>   │
│    merge address     │
│    from state)       │
│                      │
└──────┬───────────────┘
       │
       │ 4. POST /api/import/execute
       │    { shows: [{
       │        venue_address: "...",
       │        venue_lat: 40.7197,
       │        venue_lng: -73.9366
       │      }], ...}
       ▼
┌──────────────────────┐
│   Backend API        │
│                      │
│  1. Validate entity  │
│  2. Create tour      │
│  3. Insert shows ────┼───> INSERT INTO shows (
│  4. Insert budgets   │       venue_address,
│  5. Return result    │       venue_lat,
│                      │       venue_lng,
└──────┬───────────────┘       ...
       │                     ) VALUES (...)
       │ 5. Success response
       ▼
┌──────────────────────┐
│  Step4Complete       │
│  (Success message)   │
└──────┬───────────────┘
       │
       │ 6. Navigate to tour
       ▼
┌──────────────────────┐
│  TourDetailsModal    │
│                      │
│  ┌────────────────┐ │
│  │   TourMap      │ │
│  │                │ │
│  │  • Markers     │ │
│  │  • Routes      │ │
│  │  • InfoWindows │ │
│  └────────────────┘ │
└──────────────────────┘
```

## State Management Flow

```
Step3Validation Component State
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  const [showAddresses, setShowAddresses] = useState<Record<     │
│    number,                                                      │
│    { address: string, lat: number, lng: number }                │
│  >>({});                                                        │
│                                                                 │
│  Example state after entering 2 addresses:                     │
│  {                                                              │
│    0: {                                                         │
│      address: "319 Frost St, Brooklyn, NY 11222, USA",         │
│      lat: 40.7197,                                              │
│      lng: -73.9366                                              │
│    },                                                           │
│    1: {                                                         │
│      address: "1805 Geary Blvd, San Francisco, CA 94115",      │
│      lat: 37.7839,                                              │
│      lng: -122.4332                                             │
│    }                                                            │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ handleStartImport()
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Merge into importData.shows:                                  │
│                                                                 │
│  const updatedShows = importData.shows.map((show, index) => {  │
│    const addressData = showAddresses[index];                   │
│    if (addressData) {                                          │
│      return {                                                  │
│        ...show,                                                │
│        venue_address: addressData.address,                     │
│        venue_lat: addressData.lat,                             │
│        venue_lng: addressData.lng                              │
│      };                                                        │
│    }                                                           │
│    return show;                                                │
│  });                                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ onStartImport(updatedData)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  ImportWizard receives updated data:                           │
│                                                                 │
│  {                                                              │
│    shows: [                                                     │
│      {                                                          │
│        date: "2026-04-15",                                      │
│        city: "New York",                                        │
│        venueName: "Brooklyn Steel",                             │
│        venue_address: "319 Frost St, Brooklyn, NY 11222, USA", │
│        venue_lat: 40.7197,                                      │
│        venue_lng: -73.9366,                                     │
│        fee: 5000,                                               │
│        ...                                                      │
│      },                                                         │
│      ...                                                        │
│    ],                                                           │
│    budgets: [...],                                              │
│    tour: { name: "Tour Apr 2026" }                             │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Integration Points

### 1. Google Maps API
```
Component: PlacesAutocomplete.tsx
Library: @react-google-maps/api
API Used: Google Places Autocomplete API

Flow:
  User types → API searches → Returns suggestions →
  User clicks → getPlace() → Extract lat/lng →
  Call onChange(address, lat, lng)
```

### 2. Backend Endpoint
```
Endpoint: POST /api/import/execute
File: backend/server.js:2852

Request Body:
{
  entityId: string,
  shows: Array<{
    venue_address?: string,  ← Optional (can be undefined)
    venue_lat?: number,      ← Optional
    venue_lng?: number,      ← Optional
    ... other fields
  }>,
  budgets: Array<...>,
  tour: { name: string } | { id: string }
}

SQL Query (line 2914):
INSERT INTO shows (
  entity_id, tour_id, date, city, state, country,
  venue_name, venue_address, venue_lat, venue_lng, ...
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, ...)

Parameters:
  $8  = show.venue_address || show.venueAddress || null
  $9  = show.venue_lat || null
  $10 = show.venue_lng || null
```

### 3. Database Schema
```
Table: shows
Migration: backend/migrations/add_venue_address_fields.sql

Fields:
  venue_address TEXT                 ← Full address from Google Places
  venue_lat     DECIMAL(10, 8)       ← Latitude (-90 to 90)
  venue_lng     DECIMAL(11, 8)       ← Longitude (-180 to 180)

Indexes:
  idx_shows_coordinates (venue_lat, venue_lng)  ← Fast map queries
  idx_shows_tour_id (tour_id)                    ← Fast tour queries
```

## Validation & Error Handling

```
┌─────────────────────────────────────────────────────────────────┐
│ Frontend Validation                                             │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Google Maps API key exists (load error if missing)           │
│ ✓ Address selected from dropdown (no validation, but visual)   │
│ ✓ Coordinates exist (lat && lng check for green border)        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Backend Validation                                              │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Entity exists (404 if not found)                             │
│ ✓ Shows array not empty (400 if empty)                         │
│ ✓ Transaction rollback on error                                │
│ ⚠ No validation on venue fields (optional)                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Database Constraints                                            │
├─────────────────────────────────────────────────────────────────┤
│ ✓ venue_address NOT NULL but allows empty string               │
│ ✓ venue_lat NULLABLE (can be NULL if no address)               │
│ ✓ venue_lng NULLABLE (can be NULL if no address)               │
│ ✓ Coordinates indexed for performance                          │
└─────────────────────────────────────────────────────────────────┘
```

## Map Visualization Logic

```
TourMap.tsx
│
├─ 1. Filter shows with coordinates
│     shows.filter(show => show.venueLat && show.venueLng)
│
├─ 2. Segment into route batches (max 25 stops)
│     segmentRoute(shows, 25)
│     → [[show1...show25], [show26...show50], ...]
│
├─ 3. Render map
│     <GoogleMap>
│       <Marker> for each show
│       <DirectionsRenderer> for each segment
│     </GoogleMap>
│
└─ 4. Handle edge cases
      • 0 shows → "No venue coordinates available"
      • 1 show → Show marker only (no route)
      • 2+ shows → Show markers + routes
```

## Environment Variables

```
.env.local (Frontend)
────────────────────────────────────────
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...    ← Required for PlacesAutocomplete

.env (Backend)
────────────────────────────────────────
DATABASE_URL=...                        ← PostgreSQL connection string
PORT=3001                               ← Backend port
```

## File Structure

```
/
├── backend/
│   ├── server.js                       ← Import endpoint (line 2852)
│   ├── migrations/
│   │   └── add_venue_address_fields.sql ← Database migration
│   └── verify-venue-import.sh          ← Verification script
│
├── src/
│   ├── app/
│   │   └── import/
│   │       └── components/
│   │           ├── ImportWizard.tsx    ← Main import flow
│   │           └── Step3Validation.tsx  ← Address collection ⭐
│   │
│   ├── components/
│   │   ├── maps/
│   │   │   ├── PlacesAutocomplete.tsx  ← Google Places input ⭐
│   │   │   └── TourMap.tsx             ← Map visualization
│   │   └── tours/
│   │       └── TourDetailsModal.tsx    ← Shows tour map
│   │
│   └── lib/
│       └── maps/
│           └── routeUtils.ts           ← Route segmentation
│
└── Documentation/
    ├── VENUE_ADDRESS_DEBUG_GUIDE.md    ← Debugging guide
    ├── VENUE_ADDRESS_MANUAL_TEST.md    ← Testing guide
    ├── VENUE_ADDRESS_QUICK_REFERENCE.md ← Quick reference
    └── VENUE_ADDRESS_ARCHITECTURE.md   ← This file
```

---

**Legend:**
- ⭐ = New/modified for venue address feature
- ← = Indicates important note or direction
- ▼ = Data flow direction
