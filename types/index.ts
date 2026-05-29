/**
 * Shared Type Definitions
 * 
 * Centralized type definitions used across the application.
 * This ensures type consistency and reduces duplication.
 */

import type { LightThemeId, DarkThemeId } from '@/lib/theme-config';

/**
 * Profile interface matching the database schema
 */
export interface Profile {
  id: string;
  username: string;
  profile_description: string | null;
  avatar_url: string | null;
  default_light_theme?: LightThemeId | null;
  default_dark_theme?: DarkThemeId | null;
  default_unit?: string | null;
  nutrition_estimation_enabled?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Recipe interface matching the database schema
 */
export interface Recipe {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  image_url: string | null;
  description: string | null;
  view_count: number;
  favorite_count?: number | null | Array<{ count: number }>;
  average_rating?: number | null;
  rating_count?: number | null;
  tags: string[];
  is_public: boolean;
  method_steps: string[];
  notes: string[];
  servings?: number | null;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  nutrition_visible?: boolean | null;
  created_at: string;
  updated_at: string;
}

/**
 * Recipe with profile data (as returned from Supabase joins)
 */
export interface RecipeWithProfile extends Recipe {
  profiles: Profile | Profile[] | null;
  saved_recipes?: Array<{ count: number }> | null;
  recipe_rating_stats?:
    | { rating_count: number; average_rating: number }
    | Array<{ rating_count: number; average_rating: number }>
    | null;
}

/**
 * Normalized recipe interface with profiles as a single object
 * Used for consistent data structure in components
 */
export interface NormalizedRecipe {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  description: string | null;
  view_count: number;
  favorite_count: number;
  average_rating: number;
  rating_count: number;
  tags: string[];
  is_public: boolean;
  servings?: number | null;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  total_time_minutes?: number | null;
  profiles: {
    username: string;
  };
}

/**
 * Ingredient interface matching the database schema
 */
export interface Ingredient {
  id: string;
  recipe_id: string;
  name: string;
  amount_grams: number;
  unit: string;
  display_amount: number;
  order_index: number;
  created_at?: string;
}

/**
 * User statistics interface
 */
export interface UserStats {
  totalViews: number;
  favoritedRecipesCount: number;
}
