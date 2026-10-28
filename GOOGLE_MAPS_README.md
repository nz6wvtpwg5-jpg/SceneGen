# 🗺️ Google Maps Tour Route Visualization

> **Interactive tour route mapping with multi-segment support for tours of any size**

![Status](https://img.shields.io/badge/Status-Phase_1_Complete-success)
![Version](https://img.shields.io/badge/Version-1.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14+-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)
![Google Maps](https://img.shields.io/badge/Google_Maps-API-red)

---

## 📖 Overview

This implementation adds comprehensive Google Maps integration to display tour routes with:
- **All tour stops** displayed as numbered markers on an interactive map
- **Automatic route segmentation** for tours with more than 25 shows (Google Maps API limit)
- **Multi-colored route segments** for visual clarity
- **Distance calculations** between stops and per segment
- **Info windows** with show details
- **Google Places Autocomplete** for address entry during import

---

## ✨ Features

### ✅ Implemented (Phase 1)

- [x] **Interactive Map Display**
  - Google Maps with all tour stops as numbered markers
  - Click markers to see show details
  - Auto-fit bounds to display all stops

- [x] **Multi-Segment Routing**
  - Automatically handles tours with >25 shows
  - Each segment gets a unique color
  - Distance banners between segments
  - Smart overlapping for route continuity

- [x] **Database Support**
  - New fields: `venue_address`, `venue_lat`, `venue_lng`
  - Indexed coordinates for performance
  - Backwards compatible with existing data

- [x] **Components**
  - `TourMap` - Main map component
  - `PlacesAutocomplete` - Address search input
  - Full integration in Tour Details Modal

### 🔄 Pending (Phase 2)

- [ ] **Import Flow Integration**
  - Add address entry during CSV import
  - Automatic coordinate extraction
  - Validation requiring addresses

- [ ] **Backend API Updates**
  - Accept venue address fields
  - Coordinate validation
  - Update all show endpoints

---

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Ensure you have:
- Node.js 18+
- PostgreSQL database
- Google Maps API key
```

### 2. Installation

```bash
# Install dependencies
npm install @react-google-maps/api --legacy-peer-deps
```

### 3. Database Setup

```bash
# Run the migration
psql -d your_database -f backend/migrations/add_venue_address_fields.sql
```

### 4. Environment Configuration

Add to `.env.local`:
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 5. Enable Google APIs

In [Google Cloud Console](https://console.cloud.google.com/):
- Maps JavaScript API
- Places API
- Directions API
- Geocoding API (for data migration)

### 6. Start Development Server

```bash
npm run dev
```

### 7. View the Map

1. Navigate to Tours page
2. Click on any tour
3. Click the "Route" tab
4. See the magic! 🎉

---

## 📚 Documentation

### Core Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| [📋 Index](./GOOGLE_MAPS_INDEX.md) | Navigation hub for all docs | Everyone |
| [📄 Summary](./GOOGLE_MAPS_SUMMARY.md) | Executive overview | PMs, Stakeholders |
| [🔧 Implementation Plan](./GOOGLE_MAPS_IMPLEMENTATION_PLAN.md) | Technical details | Developers |
| [🧪 Testing Guide](./GOOGLE_MAPS_TESTING_GUIDE.md) | Test procedures | QA, Developers |
| [⚡ Quick Reference](./GOOGLE_MAPS_QUICK_REFERENCE.md) | API & code examples | Developers |
| [📊 Status](./GOOGLE_MAPS_STATUS.md) | Project tracking | Team Leads |
| [🏗️ Architecture](./GOOGLE_MAPS_ARCHITECTURE.md) | Visual diagrams | Architects |

### Quick Links

- **New to the project?** Start with [Summary](./GOOGLE_MAPS_SUMMARY.md)
- **Want to code?** Check [Quick Reference](./GOOGLE_MAPS_QUICK_REFERENCE.md)
- **Need to test?** Follow [Testing Guide](./GOOGLE_MAPS_TESTING_GUIDE.md)
- **Implementing Phase 2?** See [Implementation Plan](./GOOGLE_MAPS_IMPLEMENTATION_PLAN.md)
- **Visual learner?** View [Architecture](./GOOGLE_MAPS_ARCHITECTURE.md)

---

## 💻 Usage Examples

### Display Tour Route

```tsx
import { TourMap } from '@/components/maps/TourMap';

function TourRoute({ tourId }: { tourId: string }) {
  const [shows, setShows] = useState([]);

  useEffect(() => {
    fetchShowsForTour(tourId).then(setShows);
  }, [tourId]);

  return (
    <div className="h-[600px] w-full">
      <TourMap shows={shows} />
    </div>
  );
}
```

### Address Input with Autocomplete

```tsx
import { PlacesAutocomplete } from '@/components/maps/PlacesAutocomplete';

function VenueForm() {
  const [venue, setVenue] = useState({ address: '', lat: 0, lng: 0 });

  return (
    <PlacesAutocomplete
      value={venue.address}
      onChange={(address, lat, lng) => {
        setVenue({ address, lat, lng });
      }}
      label="Venue Address"
      placeholder="Search for venue"
    />
  );
}
```

---

## 🗂️ File Structure

```
src/
├── components/
│   ├── maps/
│   │   ├── TourMap.tsx                # Main map component ⭐
│   │   └── PlacesAutocomplete.tsx     # Address autocomplete ⭐
│   ├── tours/
│   │   └── TourDetailsModal.tsx       # Updated with map 📝
│   └── ui/
│       ├── alert.tsx                  # New: Error display
│       ├── input.tsx                  # New: Text input
│       └── label.tsx                  # New: Form label
└── lib/
    └── maps/
        └── routeUtils.ts              # Route utilities ⭐

backend/
└── migrations/
    └── add_venue_address_fields.sql   # Database migration ⭐

documentation/
├── GOOGLE_MAPS_INDEX.md               # This file 📖
├── GOOGLE_MAPS_SUMMARY.md
├── GOOGLE_MAPS_IMPLEMENTATION_PLAN.md
├── GOOGLE_MAPS_TESTING_GUIDE.md
├── GOOGLE_MAPS_QUICK_REFERENCE.md
├── GOOGLE_MAPS_STATUS.md
└── GOOGLE_MAPS_ARCHITECTURE.md

⭐ = Core implementation files
📝 = Modified existing files
📖 = Documentation
```

---

## 🎯 How It Works

### Route Segmentation

For tours with more than 25 shows, routes are automatically split into segments:

```
Shows 1-25:   Segment 1 (Blue)    - 1,234 miles
Shows 23-48:  Segment 2 (Green)   - 2,345 miles
Shows 46-71:  Segment 3 (Purple)  - 1,567 miles
```

Each segment:
- Contains up to 25 locations (Google's limit)
- Overlaps by 2 shows for continuity
- Has a unique color for visual distinction
- Shows total distance in a banner

### Distance Calculation

Uses the Haversine formula to calculate great-circle distances:

```typescript
const miles = calculateDistance(
  { lat: 40.7589, lng: -73.9851 },  // New York
  { lat: 34.0522, lng: -118.2437 }  // Los Angeles
);
// Result: ~2,789 miles
```

---

## 🎨 Visual Design

### Map Features

- **Numbered Markers**: Red pins with white numbers (1, 2, 3...)
- **Route Polylines**: Colored lines connecting consecutive shows
- **Info Windows**: Show venue name, address, date, and fee
- **Distance Banners**: Display miles between route segments

### Color Scheme

| Segment | Color | Hex |
|---------|-------|-----|
| 1 | Blue | #3B82F6 |
| 2 | Green | #10B981 |
| 3 | Purple | #8B5CF6 |
| 4 | Orange | #F59E0B |
| 5 | Pink | #EC4899 |
| 6 | Teal | #14B8A6 |

---

## 🧪 Testing

### Quick Test

```bash
# 1. Start dev server
npm run dev

# 2. Navigate to Tours page in browser
# 3. Click any tour
# 4. Click "Route" tab
# 5. Verify map displays
```

### Test Cases

- [ ] Tour with < 25 shows: Single blue route
- [ ] Tour with = 25 shows: Single route at limit
- [ ] Tour with > 25 shows: Multiple colored segments
- [ ] Tour with no coordinates: "No coordinates" message
- [ ] Marker clicks: Info windows display
- [ ] Map bounds: All markers visible

See [Testing Guide](./GOOGLE_MAPS_TESTING_GUIDE.md) for complete procedures.

---

## 🔧 Configuration

### Environment Variables

Required in `.env.local`:
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key
```

### Google Cloud Console Setup

1. Create/select project
2. Enable required APIs:
   - Maps JavaScript API
   - Places API
   - Directions API
   - Geocoding API
3. Create API key
4. Restrict API key:
   - Application restrictions: HTTP referrers
   - Website restrictions: Add your domain(s)
   - API restrictions: Select only needed APIs
5. Enable billing (required for Google Maps)

---

## 📊 API Quotas & Costs

### Typical Monthly Usage (Estimate)

| API | Usage | Cost per 1K | Est. Monthly |
|-----|-------|-------------|--------------|
| Maps JavaScript API | 1,000 loads | $7 | $7 |
| Places Autocomplete | 500 requests | $17 | $8.50 |
| Directions API | 200 requests | $5 | $1 |
| **Total** | | | **~$16.50** |

> Note: First $200/month is free credit from Google Cloud

### Optimization Tips

- ✅ Client-side route calculation (no Directions API calls)
- ✅ Filter shows without coordinates
- 🔄 Cache geocoded addresses (planned)
- 🔄 Batch geocoding for migrations (planned)

---

## 🐛 Troubleshooting

### Map doesn't load

**Check**:
1. API key in `.env.local`
2. Restart dev server after adding key
3. APIs enabled in Google Cloud Console
4. Billing enabled
5. Browser console for errors

**Fix**:
```bash
# Restart TypeScript server in VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"

# Or rebuild
rm -rf .next
npm run dev
```

### No markers appear

**Check**:
1. Shows have `venue_lat` and `venue_lng` values
2. Coordinates are valid (-90 to 90 lat, -180 to 180 lng)
3. Database query returns shows

**Test**:
```sql
SELECT id, venue_name, venue_lat, venue_lng
FROM shows
WHERE venue_lat IS NOT NULL
  AND venue_lng IS NOT NULL
LIMIT 10;
```

### TypeScript "Cannot find module" errors

**Fix**:
```bash
# These are cache issues, restart TS server:
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

## 🎓 Learning Resources

### Internal Documentation
- Start with [Index](./GOOGLE_MAPS_INDEX.md) for navigation
- Review [Architecture](./GOOGLE_MAPS_ARCHITECTURE.md) for visual diagrams
- Check [Quick Reference](./GOOGLE_MAPS_QUICK_REFERENCE.md) for code examples

### External Resources
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [@react-google-maps/api Docs](https://react-google-maps-api-docs.netlify.app/)
- [Google Cloud Console](https://console.cloud.google.com/)

---

## 🗺️ Roadmap

### ✅ Phase 1: Core Features (COMPLETE)
- Database schema
- Map component
- Route segmentation
- Tour Details integration
- Documentation

### 🔄 Phase 2: Import Integration (NEXT)
- PlacesAutocomplete in import flow
- Backend API updates
- Validation requiring addresses
- End-to-end testing

### 📋 Phase 3: Data Migration (OPTIONAL)
- Geocode existing shows
- Migrate city/state to addresses
- Data validation

### 🚀 Future Enhancements
- Route optimization
- Export to Google Maps app
- Travel time estimates
- Hotel/restaurant suggestions
- Weather integration

---

## 🤝 Contributing

### Adding Features

1. Review [Implementation Plan](./GOOGLE_MAPS_IMPLEMENTATION_PLAN.md)
2. Check [Status](./GOOGLE_MAPS_STATUS.md) for pending tasks
3. Follow existing code patterns
4. Update relevant documentation
5. Add tests (see [Testing Guide](./GOOGLE_MAPS_TESTING_GUIDE.md))

### Reporting Issues

1. Check [Known Issues](./GOOGLE_MAPS_STATUS.md#-known-issues)
2. Test with [Testing Guide](./GOOGLE_MAPS_TESTING_GUIDE.md)
3. Include browser console errors
4. Provide steps to reproduce

---

## 📄 License

Same as parent project.

---

## 🎯 Success Metrics

### Phase 1 (✅ Achieved)
- [x] Map renders without errors
- [x] Route segmentation works for >25 shows
- [x] Markers display correctly
- [x] Info windows show accurate data
- [x] Integrated in Tour Details Modal
- [x] Complete documentation

### Phase 2 (🎯 Targets)
- [ ] 100% of new shows have addresses
- [ ] Import completion rate >95%
- [ ] Map load time <2 seconds
- [ ] Positive user feedback
- [ ] Zero critical bugs

---

## 📞 Support

### Getting Help

1. **Documentation**: Check [Index](./GOOGLE_MAPS_INDEX.md) for relevant guide
2. **Code**: Review inline comments in components
3. **Testing**: Follow [Testing Guide](./GOOGLE_MAPS_TESTING_GUIDE.md)
4. **Console**: Check browser dev tools
5. **API**: Check Google Cloud Console

### Common Questions

**Q: How do I add addresses during import?**
A: See Phase 2 in [Implementation Plan](./GOOGLE_MAPS_IMPLEMENTATION_PLAN.md)

**Q: What if I have >100 shows?**
A: Route segmentation handles tours of any size automatically

**Q: Can I customize marker colors?**
A: Yes, modify `TourMap.tsx` marker component

**Q: How accurate are distance calculations?**
A: Uses Haversine formula, accurate for spherical Earth approximation

---

## 🎉 Acknowledgments

**Technologies**:
- Google Maps JavaScript API
- @react-google-maps/api by JustFly1984
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

**Special Thanks**:
- Google Maps Platform team
- React Google Maps community
- Open source contributors

---

## 📌 Quick Links

| Action | Link |
|--------|------|
| 📖 Read Documentation | [Index](./GOOGLE_MAPS_INDEX.md) |
| 🚀 Get Started | [Quick Reference](./GOOGLE_MAPS_QUICK_REFERENCE.md) |
| 🧪 Test Implementation | [Testing Guide](./GOOGLE_MAPS_TESTING_GUIDE.md) |
| 📊 Check Status | [Status](./GOOGLE_MAPS_STATUS.md) |
| 🏗️ View Architecture | [Architecture](./GOOGLE_MAPS_ARCHITECTURE.md) |
| 🔧 Implement Features | [Implementation Plan](./GOOGLE_MAPS_IMPLEMENTATION_PLAN.md) |

---

**Status**: ✅ Phase 1 Complete | 🔄 Phase 2 Ready to Start
**Last Updated**: January 2025
**Version**: 1.0

---

*Happy mapping! 🗺️*
