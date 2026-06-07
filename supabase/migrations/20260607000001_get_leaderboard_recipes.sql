-- Leaderboard server-side ranking function
--
-- Replaces the full-table Supabase REST fetch + in-Node sort + slice pattern
-- in app/leaderboard/page.tsx with a single RPC that scores and limits in the
-- DB. This means only the top p_limit rows cross the wire regardless of how
-- large the public recipe catalogue grows.
--
-- Scoring formula (mirrors the client-side JS that was replaced):
--   score = favorites * 10
--           + rating_count * 2
--           + ROUND(average_rating * rating_count)   -- quality-weighted bonus
--           + view_count * 1
--
-- recipe_rating_stats is a materialized view / view keyed on recipe_id that
-- holds pre-aggregated rating_count and average_rating per recipe.

CREATE OR REPLACE FUNCTION public.get_leaderboard_recipes(p_limit integer DEFAULT 100)
RETURNS TABLE (
  id            uuid,
  slug          text,
  title         text,
  image_url     text,
  description   text,
  view_count    integer,
  favorite_count bigint,
  rating_count  integer,
  average_rating numeric,
  prep_time_minutes integer,
  cook_time_minutes integer,
  tags          text[],
  username      text,
  score         bigint,
  rank          bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.slug,
    r.title,
    r.image_url,
    r.description,
    r.view_count,
    COUNT(sr.id)::bigint                                           AS favorite_count,
    COALESCE(rrs.rating_count,   0)                               AS rating_count,
    COALESCE(rrs.average_rating, 0)                               AS average_rating,
    r.prep_time_minutes,
    r.cook_time_minutes,
    r.tags,
    p.username,
    (
      COUNT(sr.id) * 10
      + COALESCE(rrs.rating_count, 0) * 2
      + ROUND(COALESCE(rrs.average_rating, 0) * COALESCE(rrs.rating_count, 0))
      + r.view_count
    )::bigint                                                      AS score,
    ROW_NUMBER() OVER (
      ORDER BY (
        COUNT(sr.id) * 10
        + COALESCE(rrs.rating_count, 0) * 2
        + ROUND(COALESCE(rrs.average_rating, 0) * COALESCE(rrs.rating_count, 0))
        + r.view_count
      ) DESC
    )                                                              AS rank
  FROM   recipes r
  JOIN   profiles              p   ON p.id         = r.user_id
  LEFT JOIN recipe_rating_stats rrs ON rrs.recipe_id = r.id
  LEFT JOIN saved_recipes       sr  ON sr.recipe_id  = r.id
  WHERE  r.is_public = true
  GROUP BY
    r.id, r.slug, r.title, r.image_url, r.description, r.view_count,
    rrs.rating_count, rrs.average_rating,
    r.prep_time_minutes, r.cook_time_minutes, r.tags, p.username
  ORDER BY score DESC
  LIMIT  p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard_recipes(integer) TO anon, authenticated;
