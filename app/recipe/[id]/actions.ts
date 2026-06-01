'use server';

import { revalidatePath } from 'next/cache';

/**
 * Invalidate the cached recipe detail page after a mutation.
 *
 * Calling this from the client before navigating expires the client-side Router
 * Cache for the recipe route, so the fresh server render is fetched exactly once
 * on navigation instead of the previous `router.replace()` + `router.refresh()`
 * double fetch.
 */
export async function revalidateRecipe(slug: string): Promise<void> {
  revalidatePath(`/recipe/${slug}`);
}
