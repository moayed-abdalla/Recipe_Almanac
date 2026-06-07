/**
 * Recipe image URL helpers.
 *
 * Cards display recipe images at ~400 × 300 px. Rather than having every call
 * site rely on next/image alone (which only optimises on-the-fly for browser
 * requests, not for service-worker precache), this module returns a URL that
 * is already sized for card contexts.
 *
 * Strategy: Supabase Storage supports image transforms via its render endpoint
 * (available on all plans as of 2024). We rewrite public object URLs to the
 * transform endpoint so the stored full-size image is never sent to the
 * browser or precached at full resolution.
 *
 * Transform endpoint shape:
 *   https://<project>.supabase.co/storage/v1/render/image/public/<bucket>/<path>
 *   ?width=400&quality=75&resize=cover
 *
 * If the URL does not look like a Supabase Storage public object, it is
 * returned unchanged so existing external URLs are unaffected.
 */

const CARD_WIDTH = 400;
const CARD_QUALITY = 75;

/**
 * Return a thumbnail URL suitable for recipe card contexts (~400 px wide).
 * Falls back to the original URL for non-Supabase or already-transformed URLs.
 */
export function getRecipeCardImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    // Only rewrite Supabase Storage public object URLs.
    const isSupabaseStorage =
      parsed.hostname.endsWith('.supabase.co') &&
      parsed.pathname.includes('/storage/v1/object/public/');

    if (!isSupabaseStorage) return url;

    // Already a render/transform URL — don't double-transform.
    if (parsed.pathname.includes('/storage/v1/render/image/')) return url;

    // Rewrite /storage/v1/object/public/<rest> → /storage/v1/render/image/public/<rest>
    const transformedPath = parsed.pathname.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    );

    const out = new URL(parsed.origin + transformedPath);
    out.searchParams.set('width', String(CARD_WIDTH));
    out.searchParams.set('quality', String(CARD_QUALITY));
    out.searchParams.set('resize', 'cover');

    return out.toString();
  } catch {
    return url;
  }
}
