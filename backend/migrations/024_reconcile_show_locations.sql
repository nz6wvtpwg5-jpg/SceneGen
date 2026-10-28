-- Fill missing values in both historical coordinate representations. If both
-- representations exist and disagree, preserve them for explicit review.
UPDATE shows
SET latitude = COALESCE(latitude, venue_lat),
    longitude = COALESCE(longitude, venue_lng),
    venue_lat = COALESCE(venue_lat, latitude),
    venue_lng = COALESCE(venue_lng, longitude)
WHERE latitude IS NULL AND venue_lat IS NOT NULL
   OR longitude IS NULL AND venue_lng IS NOT NULL
   OR venue_lat IS NULL AND latitude IS NOT NULL
   OR venue_lng IS NULL AND longitude IS NOT NULL;

-- Recover countries only from an exact final comma-delimited address component
-- recognized by the deployed territory map. City and venue text never qualify.
WITH address_candidates AS (
  SELECT show_record.id,
    trim(regexp_replace(show_record.venue_address, '^.*,', '')) candidate
  FROM shows show_record
  WHERE NULLIF(trim(show_record.country), '') IS NULL
    AND NULLIF(trim(show_record.venue_address), '') IS NOT NULL
), recognized AS (
  SELECT candidate.id, candidate.candidate
  FROM address_candidates candidate
  WHERE EXISTS (
    SELECT 1 FROM (VALUES
      ('@region:Europe'), ('@region:Asia'), ('@region:Africa'),
      ('@region:North America'), ('@region:South America'), ('@region:Oceania')
    ) region(name)
    WHERE scenegen_territory_matches(region.name, candidate.candidate)
  )
  OR scenegen_country_key(candidate.candidate) = 'GB'
  OR lower(candidate.candidate) IN ('england', 'scotland', 'wales', 'northern ireland')
)
UPDATE shows show_record
SET country = CASE
  WHEN scenegen_country_key(recognized.candidate) = 'GB'
    OR lower(recognized.candidate) IN ('england', 'scotland', 'wales', 'northern ireland')
    THEN 'United Kingdom'
  ELSE recognized.candidate
END
FROM recognized
WHERE show_record.id = recognized.id;

UPDATE shows
SET country = 'United Kingdom'
WHERE (scenegen_country_key(country) = 'GB'
  OR lower(trim(country)) IN ('england', 'scotland', 'wales', 'northern ireland'))
  AND country IS DISTINCT FROM 'United Kingdom';

CREATE INDEX IF NOT EXISTS idx_shows_entity_country
  ON shows(entity_id, country)
  WHERE country IS NOT NULL AND trim(country) <> '';
