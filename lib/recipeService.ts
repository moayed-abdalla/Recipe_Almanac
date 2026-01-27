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
  tags,
  is_public,
  profiles:user_id (
    username
  )
`;

/**
 * Fetch all recipes that a user has favorited
 * 
 * @param userId - The user ID to fetch favorites for
 * @returns Array of normalized favorite recipes
 */
export async function fetchFavoriteRecipes(userId: string): Promise<NormalizedRecipe[]> {
  try {
    // Step 1: Get list of favorited recipe IDs
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

    // Step 2: Fetch full recipe data for favorited recipes
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
  } catch (err) {
    console.error('Unexpected error fetching favorite recipes:', err);
    return [];
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
