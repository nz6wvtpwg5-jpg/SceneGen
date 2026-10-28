CREATE TABLE IF NOT EXISTS show_travel_plans (
  show_id UUID PRIMARY KEY REFERENCES shows(id) ON DELETE CASCADE,
  entity_id VARCHAR(255) NOT NULL,
  transport_mode TEXT NOT NULL DEFAULT 'van' CHECK (transport_mode IN ('van','bus','car','train','flight','ferry','other')),
  departure_at TIMESTAMPTZ,
  arrival_at TIMESTAMPTZ,
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 0 AND 10080),
  distance_miles NUMERIC(9,1) CHECK (distance_miles IS NULL OR distance_miles >= 0),
  border_notes TEXT CHECK (border_notes IS NULL OR char_length(border_notes) <= 2000),
  ferry_notes TEXT CHECK (ferry_notes IS NULL OR char_length(ferry_notes) <= 2000),
  tolls_vignettes_notes TEXT CHECK (tolls_vignettes_notes IS NULL OR char_length(tolls_vignettes_notes) <= 2000),
  low_emission_zone_notes TEXT CHECK (low_emission_zone_notes IS NULL OR char_length(low_emission_zone_notes) <= 2000),
  parking_access_notes TEXT CHECK (parking_access_notes IS NULL OR char_length(parking_access_notes) <= 2000),
  driver_notes TEXT CHECK (driver_notes IS NULL OR char_length(driver_notes) <= 2000),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (departure_at IS NULL OR arrival_at IS NULL OR arrival_at >= departure_at)
);

CREATE TABLE IF NOT EXISTS show_accommodations (
  show_id UUID PRIMARY KEY REFERENCES shows(id) ON DELETE CASCADE,
  entity_id VARCHAR(255) NOT NULL,
  hotel_name TEXT CHECK (hotel_name IS NULL OR char_length(hotel_name) <= 200),
  address TEXT CHECK (address IS NULL OR char_length(address) <= 500),
  booking_reference TEXT CHECK (booking_reference IS NULL OR char_length(booking_reference) <= 160),
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  rooming_notes TEXT CHECK (rooming_notes IS NULL OR char_length(rooming_notes) <= 3000),
  breakfast_notes TEXT CHECK (breakfast_notes IS NULL OR char_length(breakfast_notes) <= 2000),
  parking_notes TEXT CHECK (parking_notes IS NULL OR char_length(parking_notes) <= 2000),
  payer TEXT CHECK (payer IS NULL OR char_length(payer) <= 160),
  outstanding_balance NUMERIC(12,2) CHECK (outstanding_balance IS NULL OR outstanding_balance >= 0),
  currency CHAR(3) CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  confirmation_url TEXT CHECK (confirmation_url IS NULL OR char_length(confirmation_url) <= 1000),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (check_in_at IS NULL OR check_out_at IS NULL OR check_out_at > check_in_at)
);

CREATE INDEX IF NOT EXISTS idx_show_travel_plans_entity ON show_travel_plans(entity_id);
CREATE INDEX IF NOT EXISTS idx_show_accommodations_entity ON show_accommodations(entity_id);

COMMENT ON TABLE show_travel_plans IS 'Confirmed inbound journey and operational travel warnings for a show date.';
COMMENT ON TABLE show_accommodations IS 'Show-date accommodation booking, rooming and payment information.';
