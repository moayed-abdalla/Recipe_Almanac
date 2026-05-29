-- One-time cleanup for corrupted degree symbols in recipe text.
-- Run on staging/backup first. Safe to re-run (idempotent replacements).

-- Fix title
UPDATE recipes
SET title = replace(replace(title, 'Â°', '°'), E'\uFFFD', '°')
WHERE title LIKE '%Â°%' OR title LIKE '%' || E'\uFFFD' || '%';

-- Fix description
UPDATE recipes
SET description = replace(replace(description, 'Â°', '°'), E'\uFFFD', '°')
WHERE description LIKE '%Â°%' OR description LIKE '%' || E'\uFFFD' || '%';

-- Fix method_steps array elements
UPDATE recipes
SET method_steps = (
  SELECT array_agg(
    replace(replace(step, 'Â°', '°'), E'\uFFFD', '°')
  )
  FROM unnest(method_steps) AS step
)
WHERE EXISTS (
  SELECT 1
  FROM unnest(method_steps) AS s
  WHERE s LIKE '%Â°%' OR s LIKE '%' || E'\uFFFD' || '%'
);

-- Fix notes array elements
UPDATE recipes
SET notes = (
  SELECT array_agg(
    replace(replace(note, 'Â°', '°'), E'\uFFFD', '°')
  )
  FROM unnest(notes) AS note
)
WHERE EXISTS (
  SELECT 1
  FROM unnest(notes) AS n
  WHERE n LIKE '%Â°%' OR n LIKE '%' || E'\uFFFD' || '%'
);

-- Fix ingredient names
UPDATE ingredients
SET name = replace(replace(name, 'Â°', '°'), E'\uFFFD', '°')
WHERE name LIKE '%Â°%' OR name LIKE '%' || E'\uFFFD' || '%';
