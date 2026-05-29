-- Nutrition estimation feature schema changes
-- Run this in the Supabase SQL editor (or as a migration) before deploying.
--
-- 1. Per-viewer opt-in for the experimental nutrition estimator (default off).
--    Controls whether the "Nutrition (approximate)" panel renders for a user.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nutrition_estimation_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Per-recipe creator opt-out (default on).
--    When false, the nutrition panel is hidden for everyone on that recipe.
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS nutrition_visible BOOLEAN NOT NULL DEFAULT true;
