ALTER TABLE users
  ADD COLUMN IF NOT EXISTS collaborator_commission_percentage NUMERIC(5,2);

ALTER TABLE users
  ADD CONSTRAINT users_collaborator_commission_percentage_range
  CHECK (collaborator_commission_percentage IS NULL OR
    (collaborator_commission_percentage >= 0 AND collaborator_commission_percentage <= 100));

COMMENT ON COLUMN users.collaborator_commission_percentage IS
  'Private booking-agent commission estimate entered by the collaborator; never applied to accounting records.';
