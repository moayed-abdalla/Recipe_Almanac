/**
 * Server-side profile loaders.
 *
 * `getProfileByUsername` is wrapped in React's `cache()` so that multiple
 * callers in the same request (for example `generateMetadata` and the page
 * component) share a single Supabase round trip.
 */

import { cache } from 'react';
import { createServerClient } from '@/lib/supabase';
import { PROFILE_SELECT } from '@/lib/recipeQueries';
import type { Profile } from '@/types';

export const getProfileByUsername = cache(
  async (username: string): Promise<Profile | null> => {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('username', username)
      .single();

    if (error || !data) {
      return null;
    }

    return data as Profile;
  }
);
