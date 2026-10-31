-- Fictional registered promoter test fixtures. This migration is inert unless
-- the pre-existing SceneGen isolation band and exact test account both exist.
-- Never change or claim private third-party promoter contacts.
WITH test_owner AS (
  SELECT u.id::text AS administrator_id
  FROM users u
  JOIN entities isolated ON isolated.administrator_id=u.id::text
    AND isolated.entity_type='artist'
    AND isolated.name='SceneGen Isolation Test Band'
  WHERE lower(trim(u.email))='bandtest@scenegen.io'
    AND u.deleted_at IS NULL
  LIMIT 1
), conan_genre AS (
  SELECT lower(tag.value) AS genre
  FROM entities band
  CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(band.tags)='array' THEN band.tags ELSE '[]'::jsonb END
  ) AS tag(value)
  WHERE band.entity_type='artist' AND lower(trim(band.name))='conan'
    AND lower(tag.value) ~ '^#[a-z0-9]{2,40}$'
  ORDER BY CASE WHEN lower(tag.value)='#doom' THEN 0 ELSE 1 END, lower(tag.value)
  LIMIT 1
), fixtures(name,city,country) AS (
  VALUES
    ('SceneGen TEST Promoter - Birmingham','Birmingham','United Kingdom'),
    ('SceneGen TEST Promoter - Bristol','Bristol','United Kingdom')
), created AS (
  INSERT INTO entities(administrator_id,entity_type,name,bio,city,country,tags)
  SELECT owner.administrator_id,'promoter',fixture.name,
    'FICTIONAL TEST PROFILE. Used only to verify SceneGen booking introductions. Not a real promoter.',
    fixture.city,fixture.country,jsonb_build_array(genre.genre)
  FROM test_owner owner CROSS JOIN fixtures fixture CROSS JOIN conan_genre genre
  WHERE NOT EXISTS (
    SELECT 1 FROM entities existing
    WHERE existing.administrator_id=owner.administrator_id
      AND existing.entity_type='promoter' AND existing.name=fixture.name
  )
  RETURNING id
)
INSERT INTO promoter_outreach_preferences(promoter_entity_id,accepting_introductions)
SELECT created.id,TRUE FROM created
ON CONFLICT(promoter_entity_id) DO NOTHING;
