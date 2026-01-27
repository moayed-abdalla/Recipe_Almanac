/**
 * Recipe Normalization Utility
 * 
 * Converts recipes from Supabase format (with potentially array profiles)
 * to a normalized format with a single profile object.
 */

import type { RecipeWithProfile, NormalizedRecipe } from '@/types';

const extractFavoriteCount = (recipe: RecipeWithProfile): number => {
  const candidate =
    recipe.favorite_count ??
    recipe.saved_recipes ??
    (recipe as unknown as { saved_recipes?: Array<{ count: number }> | null }).saved_recipes;

  if (typeof candidate === 'number') {
    return candidate;
  }

  if (Array.isArray(candidate)) {
    return candidate[0]?.count ?? 0;
  }

  if (candidate && typeof candidate === 'object' && 'count' in candidate) {
    return (candidate as { count?: number }).count ?? 0;
  }

  return 0;
};

/**
 * Normalize recipe data from Supabase
 * Handles cases where profiles may be an array, single object, or null
 * 
 * @param recipe - Recipe data from Supabase query
 * @returns Normalized recipe with single profile object, or null if profile is missing
 */
export function normalizeRecipe(recipe: RecipeWithProfile): NormalizedRecipe | null {
  if (!recipe) return null;
  
  let profiles: { username: string } | null = null;
  
  if (Array.isArray(recipe.profiles)) {
    profiles = recipe.profiles[0] || null;
  } else if (recipe.profiles) {
    profiles = recipe.profiles;
  }
  
  if (!profiles) {
    console.warn('Recipe missing profile data:', recipe.id);
    return null;
  }
  
  return {
    id: recipe.id,
    slug: recipe.slug,
    title: recipe.title,
    image_url: recipe.image_url,
    description: recipe.description,
    view_count: recipe.view_count,
    favorite_count: extractFavoriteCount(recipe),
    tags: recipe.tags,
    is_public: recipe.is_public,
    profiles,
  };
}

/**
 * Normalize an array of recipes
 * 
 * @param recipes - Array of recipe data from Supabase query
 * @returns Array of normalized recipes (filtered to exclude null values)
 */
export function normalizeRecipes(recipes: RecipeWithProfile[]): NormalizedRecipe[] {
  return recipes
    .map((recipe) => normalizeRecipe(recipe))
    .filter((recipe): recipe is NormalizedRecipe => recipe !== null);
}
