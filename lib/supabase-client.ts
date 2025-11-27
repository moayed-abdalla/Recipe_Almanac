/**
 * Simplified Supabase Client for Client Components
 * 
 * This is a simpler alternative if you prefer not to use auth-helpers-nextjs
 * Use this in 'use client' components
 */

'use client';

import { createClient } from '@supabase/supabase-js';
// Note: Database types should be generated from Supabase
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/database.types.ts
// For now, using a simplified type
type Database = any;

// Get environment variables - use empty strings as fallback to prevent build errors
// These will be validated at runtime when the client is actually used
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create client - will throw error at runtime if env vars are missing when actually used
// This prevents build-time errors while still catching configuration issues at runtime
export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

