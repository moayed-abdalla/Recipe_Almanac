/**
 * Recipe Service
 * 
 * Centralized functions for fetching recipe data from Supabase.
 * This reduces code duplication and ensures consistent query patterns.
 */

import { supabaseClient } from '@/lib/supabase-client';
import { normalizeRecipes } from '@/utils/recipeNormalizer';
import type { NormalizedRecipe, RecipeWithProfile } from '@/types';

/**
 * Base recipe select query fields
 */
const RECIPE_SELECT_FIELDS = `
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
  profiles:user_id (
    username
  )
`;

/** Same as RECIPE_SELECT_FIELDS but includes user_id (needed by feed filters). */
const FEED_SELECT_FIELDS = `
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
  profiles:user_id (
    username
  )
`;

const FEED_LIMIT = 50;

type FavoriteRpcRow = {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  description: string | null;
  view_count: number;
  tags: string[];
  is_public: boolean;
  creator_username: string;
  favorite_count: number;
};

/**
 * Two-step fetch (saved_recipes → recipes) — used when RPC is unavailable.
 */
async function fetchFavoriteRecipesLegacy(userId: string): Promise<NormalizedRecipe[]> {
  const { data: savedData, error: savedError } = await supabaseClient
    .from('saved_recipes')
    .select('recipe_id')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });

  if (savedError) {
    console.error('Error fetching saved recipes:', savedError);
    return [];
  }

  if (!savedData || savedData.length === 0) {
    return [];
  }

  const recipeIds = savedData.map((item: { recipe_id: string }) => item.recipe_id);
  const { data, error } = await supabaseClient
    .from('recipes')
    .select(RECIPE_SELECT_FIELDS)
    .in('id', recipeIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching favorite recipes:', error);
    return [];
  }

  const recipes = (data || []) as RecipeWithProfile[];
  return normalizeRecipes(recipes);
}

/**
 * Fetch all recipes that a user has favorited
 *
 * @param userId - The user ID to fetch favorites for
 * @returns Array of normalized favorite recipes
 */
export async function fetchFavoriteRecipes(userId: string): Promise<NormalizedRecipe[]> {
  try {
    const { data, error } = await supabaseClient.rpc('get_user_favorite_recipes', {
      p_user_id: userId,
    });

    if (!error && Array.isArray(data)) {
      if (data.length === 0) {
        return [];
      }
      const recipes = (data as FavoriteRpcRow[]).map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        image_url: row.image_url,
        description: row.description,
        view_count: Number(row.view_count),
        favorite_count: Number(row.favorite_count),
        tags: row.tags,
        is_public: row.is_public,
        profiles: {
          username: row.creator_username,
        },
      })) as RecipeWithProfile[];
      return normalizeRecipes(recipes);
    }

    if (error) {
      console.warn('get_user_favorite_recipes RPC unavailable, using fallback:', error.message);
    }
    return fetchFavoriteRecipesLegacy(userId);
  } catch (err) {
    console.error('Unexpected error fetching favorite recipes:', err);
    return fetchFavoriteRecipesLegacy(userId);
  }
}

/**
 * Fetch all public recipes created by a user
 * 
 * @param userId - The user ID to fetch recipes for
 * @returns Array of normalized public recipes
 */
export async function fetchPublicRecipes(userId: string): Promise<NormalizedRecipe[]> {
  try {
    const { data, error } = await supabaseClient
      .from('recipes')
      .select(RECIPE_SELECT_FIELDS)
      .eq('user_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching public recipes:', error);
      return [];
    }

    const recipes = (data || []) as RecipeWithProfile[];
    return normalizeRecipes(recipes);
  } catch (err) {
    console.error('Unexpected error fetching public recipes:', err);
    return [];
  }
}

/**
 * Fetch all private recipes created by a user
 * 
 * @param userId - The user ID to fetch recipes for
 * @returns Array of normalized private recipes
 */
export async function fetchPrivateRecipes(userId: string): Promise<NormalizedRecipe[]> {
  try {
    const { data, error } = await supabaseClient
      .from('recipes')
      .select(RECIPE_SELECT_FIELDS)
      .eq('user_id', userId)
      .eq('is_public', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching private recipes:', error);
      return [];
    }

    const recipes = (data || []) as RecipeWithProfile[];
    return normalizeRecipes(recipes);
  } catch (err) {
    console.error('Unexpected error fetching private recipes:', err);
    return [];
  }
}

/**
 * Fetch all public recipes (for homepage/public feed)
 * 
 * @param limit - Maximum number of recipes to fetch (default: 50)
 * @returns Array of normalized public recipes
 */
export async function fetchAllPublicRecipes(limit: number = 50): Promise<NormalizedRecipe[]> {
  try {
    const { data, error } = await supabaseClient
      .from('recipes')
      .select(RECIPE_SELECT_FIELDS)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching all public recipes:', error);
      return [];
    }

    const recipes = (data || []) as RecipeWithProfile[];
    return normalizeRecipes(recipes);
  } catch (err) {
    console.error('Unexpected error fetching all public recipes:', err);
    return [];
  }
}

/**
 * Fetch the IDs of users that `userId` follows.
 */
export async function fetchFollowingIds(userId: string): Promise<string[]> {
  const { data, error } = await supabaseClient
    .from('followers')
    .select('followee_id')
    .eq('follower_id', userId);

  if (error) {
    console.error('Error fetching following ids:', error);
    return [];
  }

  return (data || []).map((row: { followee_id: string }) => row.followee_id);
}

/**
 * Feed of recent public recipes from the people a user follows.
 * Ordered most recent first, capped at 50.
 */
export async function fetchFollowingFeed(userId: string): Promise<NormalizedRecipe[]> {
  const followeeIds = await fetchFollowingIds(userId);
  if (followeeIds.length === 0) return [];

  const { data, error } = await supabaseClient
    .from('recipes')
    .select(FEED_SELECT_FIELDS)
    .in('user_id', followeeIds)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(FEED_LIMIT);

  if (error) {
    console.error('Error fetching following feed:', error);
    return [];
  }

  return normalizeRecipes((data || []) as RecipeWithProfile[]);
}

/**
 * The set of tags a user "likes" — derived from recipes they favourited and
 * recipes they rated 5 stars. Used to power the tag-based feed.
 */
export async function fetchLikedTags(userId: string): Promise<string[]> {
  const [savedResult, fiveStarResult] = await Promise.all([
    supabaseClient.from('saved_recipes').select('recipe_id').eq('user_id', userId),
    supabaseClient
      .from('recipe_ratings')
      .select('recipe_id')
      .eq('user_id', userId)
      .eq('rating', 5),
  ]);

  const recipeIds = new Set<string>();
  (savedResult.data || []).forEach((row: { recipe_id: string }) =>
    recipeIds.add(row.recipe_id)
  );
  (fiveStarResult.data || []).forEach((row: { recipe_id: string }) =>
    recipeIds.add(row.recipe_id)
  );

  if (recipeIds.size === 0) return [];

  const { data, error } = await supabaseClient
    .from('recipes')
    .select('tags')
    .in('id', Array.from(recipeIds));

  if (error) {
    console.error('Error fetching liked tags:', error);
    return [];
  }

  const tagSet = new Set<string>();
  (data || []).forEach((row: { tags: string[] | null }) => {
    (row.tags || []).forEach((tag) => {
      if (tag && tag.trim().length > 0) tagSet.add(tag);
    });
  });

  return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}

/**
 * Feed of recent public recipes that share any of the given tags,
 * excluding the viewer's own recipes. Ordered most recent first, capped at 50.
 */
export async function fetchTagFeed(
  tags: string[],
  excludeUserId: string
): Promise<NormalizedRecipe[]> {
  if (tags.length === 0) return [];

  const { data, error } = await supabaseClient
    .from('recipes')
    .select(FEED_SELECT_FIELDS)
    .overlaps('tags', tags)
    .eq('is_public', true)
    .neq('user_id', excludeUserId)
    .order('created_at', { ascending: false })
    .limit(FEED_LIMIT);

  if (error) {
    console.error('Error fetching tag feed:', error);
    return [];
  }

  return normalizeRecipes((data || []) as RecipeWithProfile[]);
}

/**
 * Random feed — a shuffled selection of recent public recipes, excluding the
 * viewer's own. PostgREST can't order randomly, so we pull a recent pool and
 * shuffle client-side.
 */
export async function fetchRandomFeed(excludeUserId: string): Promise<NormalizedRecipe[]> {
  const { data, error } = await supabaseClient
    .from('recipes')
    .select(FEED_SELECT_FIELDS)
    .eq('is_public', true)
    .neq('user_id', excludeUserId)
    .order('created_at', { ascending: false })
    .limit(150);

  if (error) {
    console.error('Error fetching random feed:', error);
    return [];
  }

  const recipes = normalizeRecipes((data || []) as RecipeWithProfile[]);

  // Fisher–Yates shuffle, then take the feed limit.
  for (let i = recipes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [recipes[i], recipes[j]] = [recipes[j], recipes[i]];
  }
  return recipes.slice(0, FEED_LIMIT);
}
