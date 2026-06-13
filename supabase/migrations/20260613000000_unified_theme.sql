-- Unified theme migration
-- Adds a single default_theme column and resets all users to 'tangerine'.
-- The old default_light_theme and default_dark_theme columns are kept for now
-- and can be dropped once the deploy has stabilized.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS default_theme TEXT DEFAULT 'tangerine';

UPDATE profiles
  SET default_theme = 'tangerine';
