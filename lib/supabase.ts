/**
 * Supabase Client Configuration
 * 
 * This file sets up the Supabase client for both client-side and server-side usage.
 * Uses separate clients for browser and server contexts.
 */

import { createClient } from '@supabase/supabase-js';
import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Database types (you can generate these with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID)
// For now, using a simplified type - generate proper types from your Supabase project
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          profile_description: string | null;
          avatar_url: string | null;
          default_theme: string | null;
          default_unit: string | null;
          nutrition_estimation_enabled: boolean;
          default_temperature_unit: 'C' | 'F';
          has_seen_home_tutorial: boolean;
          has_seen_recipe_tutorial: boolean;
          follower_count: number;
          following_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          profile_description?: string | null;
          avatar_url?: string | null;
          default_theme?: string | null;
          default_unit?: string | null;
          nutrition_estimation_enabled?: boolean;
          default_temperature_unit?: 'C' | 'F';
          has_seen_home_tutorial?: boolean;
          has_seen_recipe_tutorial?: boolean;
          follower_count?: number;
          following_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          profile_description?: string | null;
          avatar_url?: string | null;
          default_theme?: string | null;
          default_unit?: string | null;
          nutrition_estimation_enabled?: boolean;
          default_temperature_unit?: 'C' | 'F';
          has_seen_home_tutorial?: boolean;
          has_seen_recipe_tutorial?: boolean;
          follower_count?: number;
          following_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recipes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          tags: string[];
          method_steps: string[];
          method_step_image_urls: (string | null)[];
          notes: string[];
          view_count: number;
          is_public: boolean;
          servings: number | null;
          prep_time_minutes: number | null;
          cook_time_minutes: number | null;
          nutrition_visible: boolean;
          copied_from_recipe_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          tags?: string[];
          method_steps?: string[];
          method_step_image_urls?: (string | null)[];
          notes?: string[];
          view_count?: number;
          is_public?: boolean;
          servings?: number | null;
          prep_time_minutes?: number | null;
          cook_time_minutes?: number | null;
          nutrition_visible?: boolean;
          copied_from_recipe_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          tags?: string[];
          method_steps?: string[];
          method_step_image_urls?: (string | null)[];
          notes?: string[];
          view_count?: number;
          is_public?: boolean;
          servings?: number | null;
          prep_time_minutes?: number | null;
          cook_time_minutes?: number | null;
          nutrition_visible?: boolean;
          copied_from_recipe_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ingredients: {
        Row: {
          id: string;
          recipe_id: string;
          name: string;
          amount_grams: number;
          unit: string;
          display_amount: number;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          name: string;
          amount_grams: number;
          unit: string;
          display_amount: number;
          order_index: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipe_id?: string;
          name?: string;
          amount_grams?: number;
          unit?: string;
          display_amount?: number;
          order_index?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      saved_recipes: {
        Row: {
          id: string;
          user_id: string;
          recipe_id: string;
          saved_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recipe_id: string;
          saved_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          recipe_id?: string;
          saved_at?: string;
        };
        Relationships: [];
      };
      recipe_views: {
        Row: {
          id: string;
          recipe_id: string;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          viewed_at?: string;
        };
        Update: {
          id?: string;
          recipe_id?: string;
          viewed_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_public_favorited_recipes: {
        Args: {
          target_user_id: string;
        };
        Returns: Array<{
          id: string;
          slug: string;
          title: string;
          image_url: string | null;
          description: string | null;
          view_count: number;
          tags: string[];
          is_public: boolean;
          created_at: string;
          updated_at: string;
          user_id: string;
          creator_username: string;
        }>;
      };
      get_user_favorite_recipes: {
        Args: {
          p_user_id: string;
        };
        Returns: Array<{
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
        }>;
      };
      increment_view_count: {
        Args: { p_slug: string };
        Returns: number | null;
      };
      get_leaderboard_recipes: {
        Args: { p_limit?: number };
        Returns: Array<{
          id: string;
          slug: string;
          title: string;
          image_url: string | null;
          description: string | null;
          view_count: number;
          favorite_count: number;
          rating_count: number;
          average_rating: number;
          prep_time_minutes: number | null;
          cook_time_minutes: number | null;
          tags: string[];
          username: string;
          score: number;
          rank: number;
        }>;
      };
      get_rising_recipes: {
        Args: { p_period?: string; p_limit?: number };
        Returns: Array<{
          id: string;
          slug: string;
          title: string;
          image_url: string | null;
          description: string | null;
          view_count: number;
          favorite_count: number;
          rating_count: number;
          average_rating: number;
          prep_time_minutes: number | null;
          cook_time_minutes: number | null;
          tags: string[];
          username: string;
          score: number;
          rank: number;
        }>;
      };
      get_rising_creators: {
        Args: { p_period?: string; p_limit?: number };
        Returns: Array<{
          user_id: string;
          username: string;
          avatar_url: string | null;
          recipe_count: number;
          view_count: number;
          favorite_count: number;
          rating_count: number;
          average_rating: number;
          score: number;
          rank: number;
        }>;
      };
      get_recipe_remix_tree: {
        Args: { p_recipe_id: string };
        Returns: Array<{
          id: string;
          slug: string;
          title: string;
          image_url: string | null;
          username: string;
          copied_from_recipe_id: string | null;
          is_current: boolean;
          is_truncated: boolean;
        }>;
      };
    };
  };
};

// Get environment variables
// During build, these might not be available, so we'll validate at runtime
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables at runtime (not during build)
// This prevents build failures while still catching configuration issues
function validateEnvVars() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }
}


/**
 * Server-side Supabase client
 * Use this in Server Components, API routes, and Server Actions
 * Uses @supabase/ssr to properly sync cookies between client and server
 */
export async function createServerClient() {
  validateEnvVars();
  const cookieStore = await cookies();
  
  return createSSRServerClient<Database>(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Admin Supabase client (for server-side operations that need elevated permissions)
 * Only use this in secure server contexts (API routes with proper authentication)
 */
export function createAdminClient() {
  validateEnvVars();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      'Missing SUPABASE_SECRET_KEY. Set it in .env.local (server-only; never use NEXT_PUBLIC_).'
    );
  }
  return createClient<Database>(supabaseUrl!, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Simple client for non-authenticated operations
 * Use this when you don't need user context
 * Note: This will throw an error if env vars are missing when called
 * 
 * @deprecated Prefer using createServerClient() or createBrowserClient() instead
 */
export function getSupabaseClient() {
  validateEnvVars();
  return createClient<Database>(supabaseUrl!, supabaseAnonKey!);
}

