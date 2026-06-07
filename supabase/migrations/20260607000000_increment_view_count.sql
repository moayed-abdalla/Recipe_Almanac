-- Atomic view count increment
--
-- Replaces the two-query read-then-write pattern in app/api/recipes/[id]/view/route.ts
-- with a single UPDATE that is safe under concurrent requests (no lost increments).
--
-- SECURITY DEFINER is required so that anonymous viewers can increment view_count
-- on public recipes without needing a direct UPDATE policy on the recipes table.
-- The WHERE clause mirrors the SELECT RLS policy, restricting the update to:
--   - public recipes (visible to everyone), or
--   - private recipes the caller owns
--
-- Returns the updated view_count, or NULL if the slug does not match a visible recipe.

CREATE OR REPLACE FUNCTION public.increment_view_count(p_slug text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE recipes
  SET view_count = view_count + 1
  WHERE slug = p_slug
    AND (is_public = true OR user_id = auth.uid())
  RETURNING view_count INTO new_count;

  RETURN new_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_view_count(text) TO anon, authenticated;
