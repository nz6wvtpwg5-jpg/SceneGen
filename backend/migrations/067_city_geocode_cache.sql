CREATE TABLE IF NOT EXISTS city_geocode_cache (
  city_key TEXT NOT NULL,
  country_key TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  latitude NUMERIC NOT NULL CHECK(latitude BETWEEN -90 AND 90),
  longitude NUMERIC NOT NULL CHECK(longitude BETWEEN -180 AND 180),
  source TEXT NOT NULL DEFAULT 'google-geocoding',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(city_key,country_key)
);
