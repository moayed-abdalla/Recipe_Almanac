/**
 * Supabase Client for Client Components
 * 
 * Uses @supabase/ssr to sync sessions between client and server via cookies
 * Use this in 'use client' components
 */

'use client';

import { createBrowserClient } from '@supabase/ssr';
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
// Uses SSR browser client to sync cookies automatically
export const supabaseClient = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);

