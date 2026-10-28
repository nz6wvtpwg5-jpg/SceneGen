# Google Maps Integration - Visual Architecture

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         TourDetailsModal.tsx                             │   │
│  │  ┌───────────┬──────────────┬─────────────────┐        │   │
│  │  │  Route    │   Budget     │    Details      │        │   │
│  │  │   Tab     │    Tab       │     Tab         │        │   │
│  │  └─────┬─────┴──────────────┴─────────────────┘        │   │
│  │        │                                                 │   │
│  │        ▼                                                 │   │
│  │  ┌─────────────────────────────────────────────┐       │   │
│  │  │         TourMap Component                    │       │   │
│  │  │  ┌────────────────────────────────────────┐ │       │   │
│  │  │  │      Google Map Canvas                 │ │       │   │
│  │  │  │  • Markers (1, 2, 3...)               │ │       │   │
│  │  │  │  • Route Polylines                     │ │       │   │
│  │  │  │  • Info Windows                        │ │       │   │
│  │  │  │  • Distance Banners                    │ │       │   │
│  │  │  └────────────────────────────────────────┘ │       │   │
│  │  └─────────────────────────────────────────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Props: shows[]
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      UTILITY LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              routeUtils.ts                               │   │
│  │                                                           │   │
│  │  • segmentRoute()        → Split into batches           │   │
│  │  • getSegmentColor()     → Assign colors                │   │
│  │  • calculateDistance()   → Haversine formula            │   │
│  │  • formatDistance()      → "2,789 mi"                   │   │
│  │  • hasValidCoordinates() → Validate lat/lng             │   │
│  │  • getShowsWithCoordinates() → Filter valid shows       │   │
│  │                                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Processes show data
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           PostgreSQL Database                            │   │
│  │                                                           │   │
│  │  shows table:                                            │   │
│  │  ├─ id (PRIMARY KEY)                                     │   │
│  │  ├─ date                                                 │   │
│  │  ├─ venue_name                                           │   │
│  │  ├─ venue_address         ← NEW                         │   │
│  │  ├─ venue_lat (indexed)   ← NEW                         │   │
│  │  ├─ venue_lng (indexed)   ← NEW                         │   │
│  │  ├─ city (legacy)                                        │   │
│  │  ├─ state (legacy)                                       │   │
│  │  └─ ...other fields                                      │   │
│  │                                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ API fetch
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Google Maps Platform                             │   │
│  │                                                           │   │
│  │  • Maps JavaScript API    (map rendering)               │   │
│  │  • Places API             (address autocomplete)        │   │
│  │  • Directions API         (route drawing)               │   │
│  │  • Geocoding API          (address → coordinates)       │   │
│  │                                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagram

### Viewing a Tour Route (Current - Phase 1)

```
User clicks tour
      │
      ▼
TourDetailsModal opens
      │
      ▼
Fetch shows from API
      │
      ▼
Pass shows[] to TourMap
      │
      ▼
Filter shows with coordinates
      │
      ├─ Has coordinates?
      │   ├─ YES ──────────────────────────┐
      │   │                                 │
      │   │                                 ▼
      │   │                     Segment route (if >25 shows)
      │   │                                 │
      │   │                                 ▼
      │   │                     Calculate map bounds
      │   │                                 │
      │   │                                 ▼
      │   │                     Render Google Map
      │   │                                 │
      │   │                                 ├─ Draw markers (1, 2, 3...)
      │   │                                 ├─ Draw route polylines
      │   │                                 ├─ Add info windows
      │   │                                 └─ Show distance banners
      │   │
      │   └─ NO ────────────────────────────┐
      │                                      │
      │                                      ▼
      │                       Display "No coordinates" message
      │
      ▼
User sees map or message
```

### Importing a Tour with Addresses (Planned - Phase 2)

```
User uploads CSV
      │
      ▼
Map columns to fields
      │
      ▼
Validation step
      │
      ├─ For each show:
      │   │
      │   ▼
      │   PlacesAutocomplete component
      │   │
      │   ├─ User types venue name
      │   ▼
      │   Google Places API suggests
      │   │
      │   ├─ User selects from dropdown
      │   ▼
      │   Extract coordinates
      │   │
      │   ├─ venue_address = "123 Main St, City, ST 12345"
      │   ├─ venue_lat = 40.7589
      │   └─ venue_lng = -73.9851
      │
      ▼
All shows validated
      │
      ▼
Submit to backend API
      │
      ▼
Save to database (with coordinates)
      │
      ▼
Tour created successfully
      │
      ▼
User views tour → Map displays with all stops
```

---

## 🗺️ Route Segmentation Logic

### For Tours with ≤25 Shows

```
Shows: [1, 2, 3, ..., 24, 25]
              │
              ▼
    Single Route Segment
    ┌─────────────────────────┐
    │ Origin: Show 1          │
    │ Waypoints: Shows 2-24   │
    │ Destination: Show 25    │
    │ Color: Blue             │
    └─────────────────────────┘
              │
              ▼
        Render as single polyline
```

### For Tours with >25 Shows (Example: 60 Shows)

```
Shows: [1, 2, 3, ..., 58, 59, 60]
              │
              ▼
         Segment into batches
              │
    ┌─────────┼─────────┐
    │         │         │
    ▼         ▼         ▼
Segment 1  Segment 2  Segment 3
Shows 1-25 Shows 23-48 Shows 46-60
    │         │         │
    ▼         ▼         ▼
┌────────┐ ┌─────────┐ ┌─────────┐
│Origin:1│ │Origin:23│ │Origin:46│
│Way:2-24│ │Way:24-47│ │Way:47-59│
│Dest:25 │ │Dest:48  │ │Dest:60  │
│Blue    │ │Green    │ │Purple   │
└────────┘ └─────────┘ └─────────┘
    │         │         │
    └─────────┼─────────┘
              │
              ▼
     Render all segments with
     distance banners between
```

**Key Points**:
- Segments overlap by 2 shows (e.g., shows 23-25 appear in both segment 1 and 2)
- Each segment gets a unique color
- Distance banners show total miles for each segment

---

## 📊 Component Interaction Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser                                   │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  TourDetailsModal                                       │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  State:                                           │  │ │
│  │  │  • tour: Tour | null                              │  │ │
│  │  │  • shows: Show[]                                  │  │ │
│  │  │  • isLoading: boolean                             │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                       │                                 │ │
│  │                       │ Passes shows as prop            │ │
│  │                       ▼                                 │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  TourMap                                          │  │ │
│  │  │  ┌────────────────────────────────────────────┐  │  │ │
│  │  │  │  Props: shows: Show[]                      │  │  │ │
│  │  │  │  State:                                     │  │  │ │
│  │  │  │  • selectedMarker: Show | null              │  │  │ │
│  │  │  │  • directions: DirectionsResult[]           │  │  │ │
│  │  │  └────────────────────────────────────────────┘  │  │ │
│  │  │                       │                           │  │ │
│  │  │                       │ Uses utilities            │  │ │
│  │  │                       ▼                           │  │ │
│  │  │  ┌────────────────────────────────────────────┐  │  │ │
│  │  │  │  routeUtils                                 │  │  │ │
│  │  │  │  • getShowsWithCoordinates(shows)           │  │  │ │
│  │  │  │  • segmentRoute(validShows)                 │  │  │ │
│  │  │  │  • calculateDistance(...)                   │  │  │ │
│  │  │  └────────────────────────────────────────────┘  │  │ │
│  │  │                       │                           │  │ │
│  │  │                       │ Returns segments          │  │ │
│  │  │                       ▼                           │  │ │
│  │  │  ┌────────────────────────────────────────────┐  │  │ │
│  │  │  │  @react-google-maps/api                     │  │  │ │
│  │  │  │  • GoogleMap                                │  │  │ │
│  │  │  │  • Marker (x N)                             │  │  │ │
│  │  │  │  • DirectionsRenderer (x segments)          │  │  │ │
│  │  │  │  • InfoWindow                               │  │  │ │
│  │  │  └────────────────────────────────────────────┘  │  │ │
│  │  │                       │                           │  │ │
│  │  └───────────────────────┼───────────────────────────┘  │ │
│  └────────────────────────────┼──────────────────────────────┘ │
│                               │                               │
└───────────────────────────────┼───────────────────────────────┘
                                │
                                │ API Requests
                                ▼
                    ┌───────────────────────┐
                    │  Google Maps API      │
                    │  • Load map tiles     │
                    │  • Calculate routes   │
                    │  • Geocode addresses  │
                    └───────────────────────┘
```

---

## 🎨 Map Visual Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                         GOOGLE MAP                               │
│                                                                   │
│         ┌─┐                                                      │
│         │1│ Show 1 (New York)                                   │
│         └─┘                                                      │
│           │                                                       │
│           │  ────── Segment 1 (Blue) ──────                     │
│           │                                                       │
│           ▼                                                       │
│         ┌─┐                                                      │
│         │2│ Show 2 (Philadelphia)                               │
│         └─┘                                                      │
│           │                                                       │
│           │                                                       │
│           ▼                                                       │
│          ...                                                      │
│           │                                                       │
│           ▼                                                       │
│         ┌──┐                                                     │
│         │25│ Show 25 (Atlanta)                                  │
│         └──┘                                                     │
│                                                                   │
│  ┌─────────────────────────────────────────┐                    │
│  │  Segment 1: 2,345 miles                 │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                   │
│         ┌──┐                                                     │
│         │26│ Show 26 (Nashville)                                │
│         └──┘                                                     │
│           │                                                       │
│           │  ────── Segment 2 (Green) ──────                    │
│           │                                                       │
│           ▼                                                       │
│          ...                                                      │
│                                                                   │
│  [Zoom Controls]  [Fullscreen]  [Street View]                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔢 Marker Design

```
┌──────┐
│  1   │  ← Number (white text)
└──────┘
   │
   ▼
  ▼▼▼    ← Pin point
   ▼

Colors:
• Red background (#EF4444)
• White number text
• Drop shadow for depth
```

---

## 💬 Info Window Layout

```
┌─────────────────────────────────┐
│  ✕                               │  ← Close button
├─────────────────────────────────┤
│  🏛️ Madison Square Garden       │  ← Venue name
│                                  │
│  📍 4 Pennsylvania Plaza         │  ← Address
│      New York, NY 10001          │
│                                  │
│  📅 Sat, Jun 15                  │  ← Date
│                                  │
│  💵 $5,000                       │  ← Fee
└─────────────────────────────────┘
```

---

## 🎨 Color Scheme

### Route Segment Colors

```
Segment 1:  ████  Blue    #3B82F6
Segment 2:  ████  Green   #10B981
Segment 3:  ████  Purple  #8B5CF6
Segment 4:  ████  Orange  #F59E0B
Segment 5:  ████  Pink    #EC4899
Segment 6:  ████  Teal    #14B8A6
```

### Distance Banners

```
┌──────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│  Segment 1: 2,345 miles          │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└──────────────────────────────────┘

Background: Segment color with opacity
Text: White
Border: Segment color (solid)
Padding: 8px
Border radius: 4px
```

---

## 🧮 Distance Calculation Formula

### Haversine Formula Visualization

```
Earth (sphere):

         North Pole
             ★
            /│\
           / │ \
          /  │  \
    ◯────────┼────────◯
   Point A   │      Point B
            \│/
             ▼
         South Pole

Calculate:
1. Δlat = lat2 - lat1
2. Δlng = lng2 - lng1
3. a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)
4. c = 2 × atan2(√a, √(1−a))
5. distance = R × c

Where:
• R = Earth's radius (3,959 miles)
• Result in miles
```

---

## 📐 Map Bounds Calculation

```
All Show Coordinates:
[(40.7589, -73.9851), (39.9526, -75.1652), ...]
              │
              ▼
    Calculate bounds:
    ┌─────────────────────┐
    │ North: max(lat)     │
    │ South: min(lat)     │
    │ East:  max(lng)     │
    │ West:  min(lng)     │
    └─────────────────────┘
              │
              ▼
    Fit map to bounds + padding
              │
              ▼
    ┌───────────────────────────┐
    │                           │
    │   ┌───────────────────┐  │
    │   │                   │  │  ← Padding
    │   │   Map viewport    │  │
    │   │   (all markers    │  │
    │   │    visible)       │  │
    │   │                   │  │
    │   └───────────────────┘  │
    │                           │
    └───────────────────────────┘
```

---

## 🔄 State Management

```
TourMap Component State Flow:

Initial State:
┌─────────────────────┐
│ selectedMarker: null│
│ directions: []      │
│ isLoaded: false     │
└─────────────────────┘
         │
         │ useLoadScript loads Google Maps
         ▼
┌─────────────────────┐
│ isLoaded: true      │
└─────────────────────┘
         │
         │ useEffect: calculate routes
         ▼
┌─────────────────────┐
│ directions: [...]   │  ← DirectionsResults from API
└─────────────────────┘
         │
         │ User clicks marker
         ▼
┌─────────────────────┐
│ selectedMarker: Show│  ← Info window opens
└─────────────────────┘
         │
         │ User closes info window
         ▼
┌─────────────────────┐
│ selectedMarker: null│
└─────────────────────┘
```

---

## 🎭 User Interactions

```
Map Interactions:

┌─────────────────┐
│  User Action    │
└────────┬────────┘
         │
    ┌────┼────┬────────────┬──────────────┐
    │    │    │            │              │
    ▼    ▼    ▼            ▼              ▼
  Click  Drag  Zoom    Double-click   Right-click
  Marker Map   In/Out  Marker         Map
    │    │     │           │              │
    ▼    ▼     ▼           ▼              ▼
  Show  Pan   Scale    Center on      Context
  Info  View  Map      Show          Menu
  Window                              (disabled)
```

---

## 📱 Responsive Breakpoints

```
Desktop (>1024px):
┌────────────────────────────────────┐
│  Tour Details Modal                │
│  ┌────────────────────────────┐   │
│  │  Map: 90vh × max-width     │   │
│  │                             │   │
│  │      Full features          │   │
│  └────────────────────────────┘   │
└────────────────────────────────────┘

Tablet (768px - 1024px):
┌──────────────────────────┐
│  Modal                   │
│  ┌──────────────────┐   │
│  │  Map: 80vh       │   │
│  │  Responsive zoom │   │
│  └──────────────────┘   │
└──────────────────────────┘

Mobile (<768px):
┌─────────────┐
│  Modal      │
│  ┌────────┐│
│  │  Map   ││
│  │  70vh  ││
│  │        ││
│  │ Touch  ││
│  │ optimized││
│  └────────┘│
└─────────────┘
```

---

*This visual guide complements the written documentation.*
*Refer to [GOOGLE_MAPS_INDEX.md](./GOOGLE_MAPS_INDEX.md) for full documentation navigation.*
