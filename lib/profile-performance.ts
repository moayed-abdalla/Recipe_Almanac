/**
 * Dev-only Performance API marks for profiling profile load (auth vs DB phases).
 * Enable in Chrome DevTools → Performance: look for marks named profileLoad.*
 */

const PREFIX = 'profileLoad';

function isDevProfilingEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    typeof performance !== 'undefined' &&
    typeof performance.mark === 'function'
  );
}

export function profileMark(name: string): void {
  if (!isDevProfilingEnabled()) return;
  try {
    performance.mark(`${PREFIX}.${name}`);
  } catch {
    /* ignore */
  }
}

export function profileMeasure(label: string, startMark: string, endMark: string): void {
  if (!isDevProfilingEnabled()) return;
  try {
    performance.measure(`${PREFIX}:${label}`, `${PREFIX}.${startMark}`, `${PREFIX}.${endMark}`);
  } catch {
    /* ignore */
  }
}
