CREATE TABLE IF NOT EXISTS show_flight_bookings (
  show_id UUID PRIMARY KEY REFERENCES shows(id) ON DELETE CASCADE,
  entity_id VARCHAR(255) NOT NULL,
  booking_status TEXT NOT NULL DEFAULT 'not_booked'
    CHECK (booking_status IN ('not_booked', 'planned', 'booked')),
  flight_date DATE,
  flight_number VARCHAR(16),
  airline VARCHAR(160),
  departure_airport VARCHAR(160),
  departure_iata CHAR(3),
  scheduled_departure TIMESTAMPTZ,
  arrival_airport VARCHAR(160),
  arrival_iata CHAR(3),
  scheduled_arrival TIMESTAMPTZ,
  provider VARCHAR(40),
  provider_flight_id VARCHAR(200),
  booking_reference VARCHAR(160),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 2000),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (booking_status <> 'booked' OR (flight_date IS NOT NULL AND flight_number IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_show_flight_bookings_entity ON show_flight_bookings(entity_id);
CREATE INDEX IF NOT EXISTS idx_show_flight_bookings_number_date ON show_flight_bookings(flight_number, flight_date);

COMMENT ON TABLE show_flight_bookings IS
  'Selected flight identity and timetable snapshot for a show; live status remains provider-owned.';
