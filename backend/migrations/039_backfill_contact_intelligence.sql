INSERT INTO private_contact_shows(contact_id,show_id,entity_id)
SELECT pc.id,s.id,pc.entity_id
FROM private_contacts pc
JOIN shows s ON s.entity_id::text=pc.entity_id::text AND (
  (NULLIF(trim(s.promoter_email),'') IS NOT NULL AND pc.email IS NOT NULL
    AND lower(trim(pc.email))=lower(trim(s.promoter_email))) OR
  (NULLIF(trim(s.promoter_email),'') IS NULL
    AND lower(trim(pc.display_name))=lower(trim(s.promoter_name)))
)
WHERE COALESCE(trim(s.promoter_name),'')<>''
ON CONFLICT DO NOTHING;

DELETE FROM private_contact_shows duplicate
USING private_contact_shows retained
WHERE duplicate.show_id=retained.show_id
  AND duplicate.contact_id>retained.contact_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_private_contact_shows_one_contact_per_show
  ON private_contact_shows(show_id);
