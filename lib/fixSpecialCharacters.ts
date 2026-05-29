/**
 * Repair common temperature-related Unicode corruption from pasted recipe text.
 * Idempotent — safe to run on save and on every render.
 */
export function fixSpecialCharacters(text: string): string {
  return text
    // UTF-8 mojibake: "Â°" → "°"
    .replace(/Â°/g, '°')
    // Replacement char before F/C (temperature context): "350�F" / "350� F" → "350°F"
    .replace(/\uFFFD\s*(?=[FCfc]\b)/g, '°')
    // Common ordinal misuse near temps: "350º F" → "350° F"
    .replace(/(\d+(?:\.\d+)?)\s*º(?=\s*[FCfc]\b)/g, '$1°')
    // Ring-above variant: "350˚F" → "350°F"
    .replace(/(\d+(?:\.\d+)?)\s*˚/g, '$1°');
}

export function fixSpecialCharactersInArray(items: string[]): string[] {
  return items.map(fixSpecialCharacters);
}
