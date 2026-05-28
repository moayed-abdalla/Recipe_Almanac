/**
 * Relative Time Utility
 *
 * Formats a timestamp into a short human-readable relative string such as
 * "just now", "3 days ago", or "2 months ago". Used for review timestamps.
 */

export function relativeTime(dateInput: string | number | Date): string {
  const date = new Date(dateInput);
  const time = date.getTime();
  if (Number.isNaN(time)) return '';

  const diffMs = Date.now() - time;
  // Guard against clock skew making a timestamp look like it's in the future.
  const seconds = Math.max(0, Math.round(diffMs / 1000));

  if (seconds < 45) return 'just now';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;

  const months = Math.round(days / 30);
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`;

  const years = Math.round(months / 12);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}
