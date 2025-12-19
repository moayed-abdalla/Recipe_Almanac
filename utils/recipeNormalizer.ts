/**
 * Recipe Normalization Utility
 * 
 * Converts recipes from Supabase format (with potentially array profiles)
 * to a normalized format with a single profile object.
 */

import type { RecipeWithProfile, NormalizedRecipe } from '@/types';

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
