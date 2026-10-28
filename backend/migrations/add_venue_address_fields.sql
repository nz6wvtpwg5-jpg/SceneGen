-- Migration: Add venue address fields and remove city/state
-- Date: 2026-03-25

-- Add new columns for venue address and coordinates
ALTER TABLE shows
  ADD COLUMN IF NOT EXISTS venue_address TEXT,
  ADD COLUMN IF NOT EXISTS venue_lat DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS venue_lng DECIMAL(11, 8);

-- Create index on coordinates for faster map queries
CREATE INDEX IF NOT EXISTS idx_shows_coordinates ON shows(venue_lat, venue_lng);

-- Create index on tour_id for faster tour-based queries
CREATE INDEX IF NOT EXISTS idx_shows_tour_id ON shows(tour_id);

-- Note: We'll keep city and state columns for backward compatibility during migration
-- They can be removed after all data is migrated to venue_address format

-- Add comment to table
COMMENT ON COLUMN shows.venue_address IS 'Full address of the venue from Google Places';
COMMENT ON COLUMN shows.venue_lat IS 'Latitude coordinate for mapping';
COMMENT ON COLUMN shows.venue_lng IS 'Longitude coordinate for mapping';
