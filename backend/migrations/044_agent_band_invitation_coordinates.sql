ALTER TABLE agent_created_band_invitations
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE agent_created_band_invitations
  ADD CONSTRAINT agent_band_invitation_coordinates_valid
  CHECK ((latitude IS NULL AND longitude IS NULL) OR
    (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)) NOT VALID;

COMMENT ON COLUMN agent_created_band_invitations.latitude IS
  'Canonical city coordinate selected from Google Places; always stored with longitude.';
