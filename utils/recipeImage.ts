/**
 * Recipe image URL helpers.
 *
 * Cards display recipe images at ~400 × 300 px. next/image handles
 * on-the-fly resizing and WebP/AVIF conversion via the /_next/image proxy,
 * so we pass the original Supabase Storage URL through unchanged. The `sizes`
 * prop on every <Image> tells the browser (and the Next.js image loader) the
 * rendered width, ensuring only a card-sized variant is fetched — not the
 * full-resolution upload.
 *
 * The Supabase Storage render-transform endpoint
 * (/storage/v1/render/image/public/…) is a Pro-tier feature and is NOT used
 * here to maintain free-plan compatibility.
 */

/**
 * Return the image URL to use in recipe card / list contexts.
 * Currently a straight pass-through: sizing is handled by next/image + the
 * `sizes` prop at each call site. The function exists so callers have a
 * single place to update if a CDN transform becomes available later.
 */
export function getRecipeCardImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url;
}
