# Venue Address Bulk Update Tool

## Problem
When importing shows from CSV, the venue addresses and coordinates that you entered using Google Maps autocomplete were not being saved to the database. This means all your work entering those addresses was lost.

## Root Cause
The frontend was correctly collecting the address data, but there was likely a failure in the import process (either a network error, validation error, or other issue) that prevented the data from reaching the backend. The shows were created with basic CSV data (venue names, cities from CSV), but the detailed address information you entered was lost.

## Solution
Instead of making you re-import everything and lose your budgets, I've created a dedicated "Bulk Update Venues" tool that allows you to quickly add venue addresses to all your existing shows.

## What Was Created

### 1. Bulk Update Page (`/src/app/venues/bulk-update/page.tsx`)
- A dedicated page for updating venue addresses
- Shows one venue at a time with Google Maps autocomplete
- Saves progress as you go (each venue is saved individually)
- Shows progress (X of Y completed)
- Allows you to skip venues if needed
- Shows statistics (completed, remaining, total)

### 2. Button on Tours Page
- Added "Update Venues" button to the Tours page
- Located next to the "Import from CSV" button
- Only shows for artist profiles

## How to Use

1. **Navigate to the Tours page** (`/tours`)
2. **Click "Update Venues"** button (has a map pin icon)
3. **For each show:**
   - Search for the venue using Google Maps autocomplete
   - Select the correct venue from the dropdown
   - Click "Save & Next" to save and move to the next show
   - Or click "Skip" if you want to come back to it later
4. **Track your progress:**
   - Progress bar shows overall completion
   - Stats cards at the bottom show completed/remaining/total
   - Shows that are saved get a green checkmark

## Features

- ✅ **Auto-saves** each venue individually (so you won't lose progress)
- ✅ **Google Maps integration** - same autocomplete you used during import
- ✅ **Progress tracking** - see how many you've completed
- ✅ **Skip option** - skip venues you're unsure about
- ✅ **Previous button** - go back to review/edit previous venues
- ✅ **Filters automatically** - only shows venues that need addresses
- ✅ **Saves all data** - venue name, address, coordinates, city, state

## Database Schema

The shows table has the following columns for venue data:
- `venue_name` - Name of the venue
- `venue_address` - Full street address
- `venue_lat` - Latitude (from Google Places)
- `venue_lng` - Longitude (from Google Places)
- `city` - City name
- `state` - State/province code
- `country` - Country (defaults to USA)

## Current Status

### Database Analysis (as of March 26, 2026)
- **Total shows:** 32
- **Shows with addresses:** 3
- **Shows needing addresses:** 29

The 3 shows with addresses are from an earlier partial import.

### What Needs Fixing

After you update all the venue addresses using this tool, we should also:

1. **Fix the import flow** to ensure address data is properly saved during CSV import
2. **Add better error handling** in the import wizard to catch and display errors
3. **Add client-side logging** to track what data is being sent to the backend
4. **Consider adding a "Save Draft" feature** in the import wizard so you don't lose your work

## Next Steps

1. Use the bulk update tool to add addresses to your 29 shows
2. Once that's done, we'll investigate and fix the import flow
3. Then you can import new tours with confidence that the data will be saved

## Access the Tool

- **Direct URL:** `/venues/bulk-update`
- **From Tours page:** Click "Update Venues" button

## Notes

- The tool only shows shows that are missing addresses or coordinates
- Once all venues are updated, you'll see a "All Venues Updated!" message
- You can return to the tool anytime if you import more shows that need addresses
