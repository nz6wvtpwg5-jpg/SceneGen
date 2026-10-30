-- Copy one of Conan's EXISTING saved genre hashtags to the ten synthetic
-- promoter contacts owned by the isolated test band. No real contacts change.
-- When Conan has no saved genre hashtag, this is a harmless no-op.
WITH conan_genre AS (
  SELECT lower(tag.value) AS genre
  FROM entities e
  CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(e.tags)='array' THEN e.tags ELSE '[]'::jsonb END
  ) AS tag(value)
  WHERE e.entity_type='artist' AND lower(trim(e.name))='conan'
    AND lower(tag.value) ~ '^#[a-z0-9]{2,40}$'
  ORDER BY CASE WHEN lower(tag.value) IN ('#doommetal','#sludgemetal','#stonermetal') THEN 0 ELSE 1 END,
    lower(tag.value)
  LIMIT 1
), fixture AS (
  SELECT pc.id, g.genre FROM private_contacts pc
  JOIN entities e ON e.id=pc.entity_id AND e.entity_type='artist'
  JOIN users u ON u.id::text=e.administrator_id
  CROSS JOIN conan_genre g
  WHERE u.email='bandtest@scenegen.io'
    AND e.name='SceneGen Isolation Test Band'
    AND pc.email ~ '^promoter(0[1-9]|10)@scenegen-isolation[.]example$'
)
UPDATE private_contacts pc
SET tags = CASE WHEN pc.tags ? fixture.genre THEN pc.tags ELSE pc.tags || to_jsonb(fixture.genre) END,
    updated_at=NOW()
FROM fixture WHERE pc.id=fixture.id;
