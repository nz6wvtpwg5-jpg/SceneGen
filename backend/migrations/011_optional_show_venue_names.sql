-- A tour date can exist before its venue is confirmed.
ALTER TABLE shows
  ALTER COLUMN venue_name DROP NOT NULL;

-- Repair the old importer fallback that copied the city into venue_name when
-- no venue or address had been supplied. Real venue data is left untouched.
UPDATE shows
SET venue_name = NULL
WHERE venue_address IS NULL
  AND venue_name IS NOT NULL
  AND LOWER(TRIM(venue_name)) = LOWER(TRIM(city));

COMMENT ON COLUMN shows.venue_name IS
  'Optional venue name; NULL means the venue is still to be confirmed';
