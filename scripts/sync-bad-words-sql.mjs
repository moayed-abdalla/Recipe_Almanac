/**
 * Regenerates the word array in RA_git_ignore/20260623000001_bad_words_function.sql
 * from data/badWords.json. Run after editing the JSON list:
 *
 *   node scripts/sync-bad-words-sql.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const words = JSON.parse(readFileSync(join(root, 'data/badWords.json'), 'utf8')).words;

const quoted = words.map((word) => `'${word.replace(/'/g, "''")}'`).join(', ');

const sql = `-- Content moderation helpers synced from data/badWords.json
-- Word-boundary matching mirrors utils/badWords.ts
-- Regenerate with: node scripts/sync-bad-words-sql.mjs

CREATE OR REPLACE FUNCTION public.bad_words_list()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY[
    ${quoted}
  ]::text[];
$$;

CREATE OR REPLACE FUNCTION public.contains_bad_words(input text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized text;
  word text;
  pattern text;
BEGIN
  IF input IS NULL OR btrim(input) = '' THEN
    RETURN false;
  END IF;

  normalized := lower(btrim(input));

  FOREACH word IN ARRAY public.bad_words_list()
  LOOP
    pattern := '\\\\m' || regexp_replace(word, '([.*+?^$\${}()|[\\\\]\\\\-])', '\\\\\\\\\\\\1', 'g') || '\\\\M';
    IF normalized ~* pattern THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.censor_bad_words(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  censored text;
  word text;
  pattern text;
BEGIN
  IF input IS NULL OR input = '' THEN
    RETURN input;
  END IF;

  censored := input;

  FOREACH word IN ARRAY public.bad_words_list()
  LOOP
    pattern := '\\\\m' || regexp_replace(word, '([.*+?^$\${}()|[\\\\]\\\\-])', '\\\\\\\\\\\\1', 'g') || '\\\\M';
    censored := regexp_replace(censored, pattern, '*#&%', 'gi');
  END LOOP;

  RETURN censored;
END;
$$;
`;

writeFileSync(join(root, 'RA_git_ignore/20260623000001_bad_words_function.sql'), sql);
console.log(`Synced ${words.length} bad words into migration SQL.`);
