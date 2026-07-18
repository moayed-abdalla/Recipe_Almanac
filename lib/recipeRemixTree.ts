import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase';
import type { RecipeRemixTreeNode } from '@/types';

/**
 * Fetch the full remix lineage for a recipe (root + descendants).
 * Returns an empty array when the recipe is missing or the RPC fails.
 */
export async function fetchRecipeRemixTree(
  supabase: SupabaseClient<Database>,
  recipeId: string
): Promise<RecipeRemixTreeNode[]> {
  const { data, error } = await supabase.rpc('get_recipe_remix_tree', {
    p_recipe_id: recipeId,
  });

  if (error) {
    console.error('Error fetching remix tree:', error);
    return [];
  }

  return (data ?? []) as RecipeRemixTreeNode[];
}
