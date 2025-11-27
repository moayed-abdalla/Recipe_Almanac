/**
 * Supabase Client Configuration
 * 
 * This file sets up the Supabase client for both client-side and server-side usage.
 * Uses separate clients for browser and server contexts.
 */

import { createClient } from '@supabase/supabase-js';
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          profile_description?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          profile_description?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
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
          notes: string[];
          view_count: number;
          is_public: boolean;
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
          notes?: string[];
          view_count?: number;
          is_public?: boolean;
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
          notes?: string[];
          view_count?: number;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
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
 * Client-side Supabase client
 * Use this in React components that run in the browser ('use client')
 */
export function createBrowserClient() {
  validateEnvVars();
  return createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

/**
 * Server-side Supabase client
 * Use this in Server Components, API routes, and Server Actions
 */
export async function createServerClient() {
  validateEnvVars();
  const cookieStore = await cookies();
  
  return createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Cookie: cookieStore.toString(),
      },
    },
  });
}

/**
 * Admin Supabase client (for server-side operations that need elevated permissions)
 * Only use this in secure server contexts (API routes with proper authentication)
 */
export function createAdminClient() {
  validateEnvVars();
  return createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
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

