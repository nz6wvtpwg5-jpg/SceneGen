ALTER TABLE auth_tokens DROP CONSTRAINT IF EXISTS auth_tokens_purpose_check;
ALTER TABLE auth_tokens ADD CONSTRAINT auth_tokens_purpose_check
  CHECK (purpose IN ('verify_email', 'reset_password', 'collaborator_login'));

DELETE FROM auth_tokens older USING auth_tokens newer
WHERE older.user_id = newer.user_id AND older.purpose = newer.purpose
  AND (older.created_at, older.id) < (newer.created_at, newer.id);

ALTER TABLE auth_tokens
  ADD CONSTRAINT auth_tokens_user_purpose_key UNIQUE (user_id, purpose);
