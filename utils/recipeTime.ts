/**
 * Recipe Time Utilities
 *
 * Helpers for working with the optional servings / prep / cook time fields.
 * All helpers treat null/undefined/invalid values as "not set" so callers can
 * safely skip rendering when nothing meaningful is available.
 */

/**
 * Normalize a possibly-null numeric field into a positive integer or null.
 * Zero and negative values are treated as "not set".
 */
export function toPositiveInt(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
}

/**
 * Sum prep and cook time. Returns null when neither is set.
 */
export function getTotalTimeMinutes(
  prep: number | null | undefined,
  cook: number | null | undefined
): number | null {
  const p = toPositiveInt(prep) ?? 0;
  const c = toPositiveInt(cook) ?? 0;
  const total = p + c;
  return total > 0 ? total : null;
}

/**
 * Convert minutes into an ISO 8601 duration string (e.g. 75 -> "PT1H15M").
 * Returns undefined when the value is not a usable positive integer.
 */
export function minutesToIso8601Duration(
  value: number | null | undefined
): string | undefined {
  const minutes = toPositiveInt(value);
  if (minutes == null) return undefined;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  let duration = 'PT';
  if (hours > 0) duration += `${hours}H`;
  if (mins > 0 || hours === 0) duration += `${mins}M`;
  return duration;
}

/**
 * Parse an ISO 8601 duration string (e.g. "PT15M", "PT1H30M") into total minutes.
 * Returns null when the value is missing or not a usable duration.
 */
export function iso8601DurationToMinutes(value: string | null | undefined): number | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim().toUpperCase();
  if (!trimmed.startsWith('P')) return null;

  const timePart = trimmed.includes('T') ? trimmed.split('T')[1] : '';
  if (!timePart) return null;

  const hoursMatch = timePart.match(/(\d+(?:\.\d+)?)H/);
  const minsMatch = timePart.match(/(\d+(?:\.\d+)?)M/);
  const hours = hoursMatch ? parseFloat(hoursMatch[1]) : 0;
  const mins = minsMatch ? parseFloat(minsMatch[1]) : 0;
  const total = Math.round(hours * 60 + mins);
  return total > 0 ? total : null;
}
