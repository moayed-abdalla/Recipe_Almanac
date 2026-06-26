/**
 * Server-side recipe loaders.
 *
 * `getRecipeBySlug` is wrapped in React's `cache()` so that multiple callers in
 * the same request (for example `generateMetadata` and the page component)
 * share a single Supabase round trip instead of querying the same slug twice.
 */

import { cache } from 'react';
import { createServerClient } from '@/lib/supabase';
import { RECIPE_FULL_SELECT } from '@/lib/recipeQueries';
import type { RecipeWithProfile } from '@/types';

export const getRecipeBySlug = cache(
  async (slug: string): Promise<RecipeWithProfile | null> => {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('recipes')
      .select(RECIPE_FULL_SELECT)
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return null;
    }

    return data as RecipeWithProfile;
  }
);
