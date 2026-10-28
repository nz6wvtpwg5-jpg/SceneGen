ALTER TABLE auth_tokens DROP CONSTRAINT IF EXISTS auth_tokens_purpose_check;
ALTER TABLE auth_tokens ADD CONSTRAINT auth_tokens_purpose_check
  CHECK (purpose IN ('verify_email', 'reset_password', 'collaborator_login', 'registration_status'));

COMMENT ON COLUMN auth_tokens.purpose IS
  'Single-purpose opaque authentication tokens, including privacy-safe registration status polling.';
