/**
 * Print URL parameter helpers
 *
 * The print view (`/recipe/[id]/print`) is opened in a new browser tab, so the
 * currently-applied scale multiplier and per-ingredient unit choices have to be
 * carried across via the URL. These helpers encode/decode that state in a way
 * that works in both the browser (btoa/atob) and on the Node server (Buffer)
 * so the same module can be imported from a Client Component and a Server
 * Component without behaving differently.
 *
 * Query shape: `?m=<multiplier>&u=<base64-json>&auto=1`
 *  - `m`    multiplier (e.g. `2`)
 *  - `u`    base64 of `encodeURIComponent(JSON.stringify({ ingredientId: unit }))`
 *  - `auto` when `1`, the print view triggers `window.print()` on load
 */

/** Map of ingredient id -> chosen display unit. */
export type UnitOverrides = Record<string, string>;

function toBase64(input: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(input);
  }
  return Buffer.from(input, 'utf-8').toString('base64');
}

function fromBase64(input: string): string {
  if (typeof atob !== 'undefined') {
    return atob(input);
  }
  return Buffer.from(input, 'base64').toString('utf-8');
}

/** Encode an ingredient unit map into a URL-safe base64 string. */
export function encodeUnitOverrides(overrides: UnitOverrides): string {
  return toBase64(encodeURIComponent(JSON.stringify(overrides)));
}

/** Decode the `u` search param back into an ingredient unit map. */
export function decodeUnitOverrides(value: string | null | undefined): UnitOverrides {
  if (!value) return {};
  try {
    const json = decodeURIComponent(fromBase64(value));
    const parsed = JSON.parse(json) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: UnitOverrides = {};
      for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof val === 'string') out[key] = val;
      }
      return out;
    }
  } catch {
    // Malformed input — fall through to the empty default.
  }
  return {};
}

/** Parse the `m` search param into a positive multiplier (defaults to 1). */
export function parseMultiplier(value: string | null | undefined): number {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
