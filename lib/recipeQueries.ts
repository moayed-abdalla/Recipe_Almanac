/**
 * Shared Supabase select strings for recipes, ingredients, and profiles.
 *
 * When adding a DB column, update the matching type in types/index.ts and the
 * relevant constant here. Card selects intentionally omit heavy arrays
 * (method_steps, notes, method_step_image_urls).
 */

/** Grids, feed, search, favorites — HomePage, profile grids, recipeService */
export const RECIPE_CARD_SELECT = `
  id,
  slug,
  title,
  image_url,
  description,
  view_count,
  favorite_count:saved_recipes(count),
  recipe_rating_stats (
    rating_count,
    average_rating
  ),
  tags,
  is_public,
  servings,
  prep_time_minutes,
  cook_time_minutes,
  created_at,
  profiles:user_id (
    username
  )
`;

/** Feed filters that need user_id — recipeService feed/tag/random queries */
export const RECIPE_CARD_SELECT_WITH_USER = `
  id,
  user_id,
  slug,
  title,
  image_url,
  description,
  view_count,
  favorite_count:saved_recipes(count),
  recipe_rating_stats (
    rating_count,
    average_rating
  ),
  tags,
  is_public,
  servings,
  prep_time_minutes,
  cook_time_minutes,
  created_at,
  profiles:user_id (
    username
  )
`;

/** Detail, edit, print — getRecipeBySlug and full-recipe server loads */
export const RECIPE_FULL_SELECT = `
  id,
  user_id,
  slug,
  title,
  image_url,
  description,
  view_count,
  tags,
  is_public,
  method_steps,
  method_step_image_urls,
  notes,
  servings,
  prep_time_minutes,
  cook_time_minutes,
  nutrition_visible,
  copied_from_recipe_id,
  created_at,
  updated_at,
  profiles:user_id (
    username,
    avatar_url
  )
`;

/** Forms and detail pages — edit, print, RecipeDetailPage */
export const INGREDIENT_SELECT =
  'id, recipe_id, name, amount_grams, unit, display_amount, order_index';

/** All profile reads — profile pages, ProfileContext, profile edit */
export const PROFILE_SELECT = `
  id,
  username,
  profile_description,
  avatar_url,
  default_theme,
  default_unit,
  default_temperature_unit,
  nutrition_estimation_enabled,
  has_seen_home_tutorial,
  has_seen_recipe_tutorial,
  follower_count,
  following_count,
  created_at,
  updated_at
`;
