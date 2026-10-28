CREATE TABLE IF NOT EXISTS booking_agent_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 120),
  agency_name TEXT CHECK (agency_name IS NULL OR char_length(agency_name) <= 200),
  bio TEXT CHECK (bio IS NULL OR char_length(bio) <= 2000),
  city TEXT CHECK (city IS NULL OR char_length(city) <= 120),
  region TEXT CHECK (region IS NULL OR char_length(region) <= 120),
  country TEXT CHECK (country IS NULL OR char_length(country) <= 120),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((latitude IS NULL AND longitude IS NULL) OR
    (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))
);

COMMENT ON TABLE booking_agent_profiles IS
  'User-level booking-agent persona. It completes onboarding but never grants access to an artist workspace.';
