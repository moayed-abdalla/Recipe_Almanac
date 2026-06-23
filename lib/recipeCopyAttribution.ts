/**
 * Helpers for recipe copy attribution (forked recipes).
 */

export type RecipeCopySource = {
  slug: string;
  title: string;
};

export function getRecipeUrl(slug: string, siteUrl?: string): string {
  const base = siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://recipealmanac.xyz';
  return `${base}/recipe/${slug}`;
}

export function formatCopyAttributionText(
  source: RecipeCopySource,
  siteUrl?: string
): string {
  return `Copied from ${source.title} (${getRecipeUrl(source.slug, siteUrl)})`;
}
