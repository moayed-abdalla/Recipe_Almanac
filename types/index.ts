/**
 * Shared Type Definitions
 * 
 * Centralized type definitions used across the application.
 * This ensures type consistency and reduces duplication.
 */

import type { ThemeId } from '@/lib/theme-config';
import type { TemperatureUnitValue } from '@/lib/temperature-config';

/**
 * Profile interface matching the database schema
 */
export interface Profile {
  id: string;
  username: string;
  profile_description: string | null;
  avatar_url: string | null;
  default_theme?: ThemeId | null;
  default_unit?: string | null;
  default_temperature_unit?: TemperatureUnitValue | null;
  nutrition_estimation_enabled?: boolean | null;
  has_seen_home_tutorial?: boolean | null;
  has_seen_recipe_tutorial?: boolean | null;
  follower_count?: number | null;
  following_count?: number | null;
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

/**
 * Follow-graph context for a profile page, resolved server-side.
 */
export interface ProfileFollowInfo {
  /** auth.users id of the profile being viewed. */
  profileId: string;
  username: string;
  /** Viewer is the owner of this profile. */
  isOwnProfile: boolean;
  /** Viewer is signed in. */
  isLoggedIn: boolean;
  /** Viewer currently follows this profile. */
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}
