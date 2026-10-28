-- Make the routing/import schema reproducible on every database.
-- Earlier versions shipped these changes in unnumbered SQL files, which are
-- intentionally ignored by migrate-deploy.js. Keep this migration immutable
-- after it has been deployed.
ALTER TABLE shows
  ADD COLUMN IF NOT EXISTS venue_lat DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS venue_lng DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS show_type VARCHAR(20);

UPDATE shows
SET show_type = 'show'
WHERE show_type IS NULL;

ALTER TABLE shows
  ALTER COLUMN show_type SET DEFAULT 'show',
  ALTER COLUMN show_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'shows'::regclass
      AND conname = 'shows_show_type_check'
  ) THEN
    ALTER TABLE shows
      ADD CONSTRAINT shows_show_type_check
      CHECK (show_type IN ('show', 'off_day', 'travel_day'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_shows_coordinates
  ON shows(venue_lat, venue_lng);

CREATE INDEX IF NOT EXISTS idx_shows_show_type
  ON shows(show_type);

COMMENT ON COLUMN shows.venue_lat IS
  'Latitude coordinate selected for the venue or routing stop';
COMMENT ON COLUMN shows.venue_lng IS
  'Longitude coordinate selected for the venue or routing stop';
COMMENT ON COLUMN shows.show_type IS
  'Schedule entry type: show, off_day, or travel_day';
