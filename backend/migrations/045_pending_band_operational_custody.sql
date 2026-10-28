ALTER TABLE entities
  DROP CONSTRAINT IF EXISTS entities_administrator_id_key;

CREATE INDEX IF NOT EXISTS idx_entities_administrator_id
  ON entities(administrator_id);

UPDATE agent_created_band_invitations
SET status = 'expired'
WHERE status = 'pending' AND expires_at <= NOW();

INSERT INTO entities
    (id, administrator_id, entity_type, name, bio, city, state, country, latitude, longitude)
SELECT invitation.id, invitation.agent_user_id::text, 'artist', invitation.band_name,
  invitation.bio, invitation.city, invitation.state, invitation.country,
  invitation.latitude, invitation.longitude
FROM agent_created_band_invitations invitation
WHERE invitation.status = 'pending'
  AND invitation.expires_at > NOW()
  AND invitation.entity_id IS NULL
ON CONFLICT (id) DO NOTHING;

UPDATE agent_created_band_invitations invitation
SET entity_id = invitation.id
FROM entities entity
WHERE invitation.status = 'pending'
  AND invitation.entity_id IS NULL
  AND entity.id = invitation.id
  AND entity.administrator_id = invitation.agent_user_id::text
  AND entity.entity_type = 'artist';

COMMENT ON INDEX idx_entities_administrator_id IS
  'Allows one user, including an agent in temporary custody, to administer multiple artist workspaces.';
