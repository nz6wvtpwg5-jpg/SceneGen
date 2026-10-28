CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), google_place_id TEXT, fingerprint TEXT NOT NULL,
  name TEXT NOT NULL, address TEXT, city TEXT NOT NULL, region TEXT, country TEXT,
  country_code TEXT CHECK (country_code IS NULL OR char_length(country_code) = 2), postal_code TEXT,
  latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
  capacity INTEGER CHECK (capacity IS NULL OR capacity >= 0), source TEXT NOT NULL DEFAULT 'scenegen',
  CONSTRAINT venues_coordinates_valid CHECK ((latitude IS NULL AND longitude IS NULL) OR
    (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS venues_google_place_id_unique ON venues (google_place_id) WHERE google_place_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS venues_fingerprint_unique ON venues (fingerprint);
CREATE INDEX IF NOT EXISTS venues_city_country_search ON venues (lower(city), lower(COALESCE(country, '')), lower(name));
ALTER TABLE shows ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id) ON DELETE SET NULL;
ALTER TABLE shows ADD COLUMN IF NOT EXISTS venue_place_id TEXT;
CREATE INDEX IF NOT EXISTS shows_venue_id_idx ON shows(venue_id);

INSERT INTO venues (fingerprint,name,address,city,region,country,latitude,longitude,capacity,source)
SELECT DISTINCT ON (fingerprint) fingerprint,venue_name,venue_address,city,state,country,
  CASE WHEN COALESCE(venue_lat,latitude) BETWEEN -90 AND 90
    AND COALESCE(venue_lng,longitude) BETWEEN -180 AND 180 THEN COALESCE(venue_lat,latitude) END,
  CASE WHEN COALESCE(venue_lat,latitude) BETWEEN -90 AND 90
    AND COALESCE(venue_lng,longitude) BETWEEN -180 AND 180 THEN COALESCE(venue_lng,longitude) END,
  CASE WHEN capacity >= 0 THEN capacity END,'history'
FROM (SELECT s.*, md5(lower(regexp_replace(trim(COALESCE(venue_name,'')),'\s+',' ','g'))||'|'||
  lower(regexp_replace(trim(COALESCE(city,'')),'\s+',' ','g'))||'|'||
  lower(regexp_replace(trim(COALESCE(country,'')),'\s+',' ','g'))||'|'||
  lower(regexp_replace(trim(COALESCE(venue_address,'')),'\s+',' ','g'))) fingerprint
  FROM shows s WHERE NULLIF(trim(COALESCE(venue_name,'')),'') IS NOT NULL
  AND NULLIF(trim(COALESCE(city,'')),'') IS NOT NULL AND COALESCE(show_type,'show')='show') historical
ORDER BY fingerprint,updated_at DESC NULLS LAST,created_at DESC NULLS LAST ON CONFLICT (fingerprint) DO NOTHING;

UPDATE shows s SET venue_id=v.id FROM venues v WHERE s.venue_id IS NULL AND v.fingerprint=md5(
  lower(regexp_replace(trim(COALESCE(s.venue_name,'')),'\s+',' ','g'))||'|'||
  lower(regexp_replace(trim(COALESCE(s.city,'')),'\s+',' ','g'))||'|'||
  lower(regexp_replace(trim(COALESCE(s.country,'')),'\s+',' ','g'))||'|'||
  lower(regexp_replace(trim(COALESCE(s.venue_address,'')),'\s+',' ','g')));
