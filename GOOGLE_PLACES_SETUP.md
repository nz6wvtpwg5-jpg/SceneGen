# Google Places Autocomplete Setup

## What's Implemented

The location field in the Calendar Event Modal now features **Google Places Autocomplete**, providing intelligent location suggestions as users type.

## Features

- 🔍 **Real-time autocomplete** - Suggestions appear as you type
- 🏢 **Venues & Addresses** - Finds businesses, venues, landmarks, and addresses
- 🌍 **Global coverage** - Works worldwide
- 📍 **Precise locations** - Returns full formatted addresses
- ⚡ **Fast & responsive** - Powered by Google Maps Places API

---

## Setup Required

### 1. Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable these APIs:
   - **Maps JavaScript API**
   - **Places API**
4. Create credentials → API Key
5. Restrict the API key (recommended):
   - Application restrictions: HTTP referrers
   - Add your domains: `http://localhost:3000/*`, `https://yourdomain.com/*`
   - API restrictions: Restrict key to selected APIs
   - Select: Maps JavaScript API, Places API

### 2. Add API Key to Environment Variables

Add to `.env.local`:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

⚠️ **Important**: The `NEXT_PUBLIC_` prefix is required for client-side access.

### 3. Restart Development Server

```bash
pnpm dev
```

---

## Usage

### In Calendar Event Modal

1. Click any calendar event to edit
2. Click the "Edit" button
3. Click the location field
4. Start typing (e.g., "Blue Note Jazz Club")
5. Select from the dropdown suggestions
6. The full address is automatically filled

### What Gets Saved

- **formatted_address**: Full formatted address (e.g., "Blue Note, 131 W 3rd St, New York, NY 10012")
- Optionally can extract:
  - Venue name
  - City
  - State
  - Country
  - Coordinates (lat/lng)
  - Place ID (for future lookups)

---

## Component: PlacesAutocomplete

### Location
`/src/components/ui/PlacesAutocomplete.tsx`

### Props

```typescript
interface PlacesAutocompleteProps {
  value: string;                    // Current input value
  onChange: (value: string) => void; // Called when value changes
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void; // Called when place selected
  placeholder?: string;              // Input placeholder
  className?: string;                // Additional CSS classes
}
```

### Example Usage

```tsx
import PlacesAutocomplete from '@/components/ui/PlacesAutocomplete';

function MyComponent() {
  const [location, setLocation] = useState('');

  return (
    <PlacesAutocomplete
      value={location}
      onChange={setLocation}
      onPlaceSelect={(place) => {
        console.log('Selected:', place.formatted_address);
        console.log('Coordinates:', place.geometry?.location);
      }}
      placeholder="Search for a location"
    />
  );
}
```

---

## Extracted Place Data

When a place is selected, the `onPlaceSelect` callback receives a full `PlaceResult` object:

```typescript
{
  name: "Blue Note Jazz Club",
  formatted_address: "131 W 3rd St, New York, NY 10012, USA",
  address_components: [
    { long_name: "131", short_name: "131", types: ["street_number"] },
    { long_name: "West 3rd Street", short_name: "W 3rd St", types: ["route"] },
    { long_name: "Manhattan", short_name: "Manhattan", types: ["sublocality"] },
    { long_name: "New York", short_name: "New York", types: ["locality"] },
    { long_name: "New York", short_name: "NY", types: ["administrative_area_level_1"] },
    { long_name: "United States", short_name: "US", types: ["country"] },
    { long_name: "10012", short_name: "10012", types: ["postal_code"] }
  ],
  geometry: {
    location: { lat: 40.7308, lng: -74.0003 }
  },
  place_id: "ChIJ...",
  types: ["night_club", "bar", "establishment", "point_of_interest"]
}
```

---

## Parsing Place Data

Example helper to extract venue and city:

```typescript
function parsePlace(place: google.maps.places.PlaceResult) {
  const venueName = place.name || '';

  // Extract city
  const city = place.address_components?.find(
    (c) => c.types.includes('locality')
  )?.long_name || '';

  // Extract state
  const state = place.address_components?.find(
    (c) => c.types.includes('administrative_area_level_1')
  )?.short_name || '';

  // Extract country
  const country = place.address_components?.find(
    (c) => c.types.includes('country')
  )?.long_name || '';

  return {
    venueName,
    city: state ? `${city}, ${state}` : city,
    country,
    fullAddress: place.formatted_address || '',
    coordinates: {
      lat: place.geometry?.location?.lat(),
      lng: place.geometry?.location?.lng(),
    },
  };
}
```

---

## Cost Considerations

### Google Maps Pricing (as of 2024)

**Places API - Autocomplete (per session)**:
- First 100,000 sessions/month: **$0.017 per session**
- Over 100,000 sessions/month: $0.017 per session

**What's a session?**
A session starts when user types and ends when they select a place (max 3 minutes).

### Estimated Costs

| Users/Month | Autocomplete Uses | Cost/Month |
|-------------|------------------|------------|
| 100 | 200 sessions | $3.40 |
| 500 | 1,000 sessions | $17.00 |
| 1,000 | 2,000 sessions | $34.00 |
| 5,000 | 10,000 sessions | $170.00 |

**Free Tier**: Google provides $200 credit/month, covers ~11,700 autocomplete sessions.

---

## Optimization Tips

### 1. Session Management
The component automatically manages sessions properly (starts on focus, ends on selection).

### 2. Debouncing
Already built-in by Google's autocomplete widget.

### 3. Restrict Results
You can limit to specific countries to reduce irrelevant results:

```typescript
const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
  types: ['establishment', 'geocode'],
  componentRestrictions: { country: ['us', 'ca', 'gb'] }, // US, Canada, UK only
  fields: ['name', 'formatted_address', 'geometry'], // Only request needed fields
});
```

### 4. Cache Popular Venues
Store frequently used venues in your database to avoid repeated API calls.

---

## Alternative: Free Autocomplete

If you want to avoid Google's costs, alternatives include:

### 1. **Mapbox Geocoding API**
- Free tier: 100,000 requests/month
- $0.50 per 1,000 requests after
- Good autocomplete quality

### 2. **OpenStreetMap Nominatim**
- Free and open-source
- Self-hosted or use public servers
- Lower quality, rate limits

### 3. **Custom Database**
- Build your own venue database
- Perfect for repeat venues
- No per-query costs
- Requires maintenance

---

## Troubleshooting

### "Loading location services..." forever

**Cause**: API key not set or invalid

**Fix**:
1. Check `.env.local` has `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
2. Restart dev server: `pnpm dev`
3. Check browser console for API errors

### No suggestions appearing

**Causes**:
- API key restrictions too strict
- Places API not enabled
- Billing not set up on Google Cloud

**Fix**:
1. Check Google Cloud Console → APIs & Services → Enabled APIs
2. Ensure "Places API" is enabled
3. Check API key restrictions allow your domain
4. Enable billing (required even for free tier)

### "This API project is not authorized to use this API"

**Fix**: Enable Places API in Google Cloud Console

---

## Security Best Practices

### 1. Restrict API Key
- Set HTTP referrer restrictions
- Only allow your domains
- Restrict to specific APIs

### 2. Monitor Usage
- Set up billing alerts in Google Cloud
- Monitor for unusual spikes
- Review API usage reports

### 3. Environment Variables
- Never commit API keys to Git
- Use `.env.local` for development
- Use platform secrets for production (Vercel, etc.)

---

## Production Deployment

### Vercel

Add environment variable in Vercel Dashboard:
1. Project Settings → Environment Variables
2. Add: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
3. Value: Your API key
4. Redeploy

### Other Platforms

Same process - add the environment variable to your hosting platform's configuration.

---

## Current Integration

### Files Modified
- ✅ `/src/components/ui/PlacesAutocomplete.tsx` - New component
- ✅ `/src/components/shows/CalendarEventModal.tsx` - Integrated autocomplete

### Where It Works
- ✅ Calendar Event Modal → Edit → Location field
- 🔄 Can be used anywhere location input is needed

### Future Integrations
Could be added to:
- CreateShowForm (venue selection)
- Venue database entry
- User profile location
- Search filters
