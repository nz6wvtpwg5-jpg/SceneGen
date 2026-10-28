ALTER TABLE users
  ADD COLUMN IF NOT EXISTS collaborator_profile_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS collaborator_profile_confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN users.collaborator_profile_name IS
  'Self-confirmed display name used only in the external collaborator experience.';
COMMENT ON COLUMN users.collaborator_profile_confirmed_at IS
  'Set when an external day-sheet collaborator confirms their displayed name.';