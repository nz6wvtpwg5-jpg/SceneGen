-- Operational driving mileage is independent of show budgets and currency.
CREATE TABLE IF NOT EXISTS tour_route_legs (
  entity_id VARCHAR(255) NOT NULL,
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  from_show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  to_show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  distance_miles NUMERIC(10,1) NOT NULL CHECK (distance_miles >= 0),
  distance_meters INTEGER NOT NULL CHECK (distance_meters >= 0),
  from_location_key TEXT NOT NULL,
  to_location_key TEXT NOT NULL,
  approximate BOOLEAN NOT NULL DEFAULT FALSE,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (entity_id,tour_id,to_show_id),
  CHECK (from_show_id <> to_show_id)
);
CREATE INDEX IF NOT EXISTS idx_tour_route_legs_tour ON tour_route_legs (tour_id,entity_id);
