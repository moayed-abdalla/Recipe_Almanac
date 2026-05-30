/**
 * Heuristic free-text recipe parser.
 *
 * Turns a pasted recipe blob into a structured draft that maps onto the Recipe
 * Almanac create form. Parsing is best-effort: nothing is ever discarded, so
 * lines that cannot be confidently structured still land in the closest field
 * for the user to fix manually. The form below the importer is the safety net.
 */

import { fixSpecialCharacters } from '@/lib/fixSpecialCharacters';
import { DEFAULT_UNIT, type UnitValue } from '@/lib/unit-config';

export interface ParsedIngredient {
  name: string;
  amount: number;
  unit: string;
}

export interface ParsedRecipeDraft {
  title: string;
  description: string;
  tags: string;
  servings: string;
  prepTime: string;
  cookTime: string;
  ingredients: ParsedIngredient[];
  methodSteps: string[];
  notes: string[];
  warnings: string[];
}

type SectionName = 'description' | 'ingredients' | 'method' | 'notes';

const UNICODE_FRACTIONS: Record<string, string> = {
  '½': '1/2',
  '⅓': '1/3',
  '⅔': '2/3',
  '¼': '1/4',
  '¾': '3/4',
  '⅕': '1/5',
  '⅖': '2/5',
  '⅗': '3/5',
  '⅘': '4/5',
  '⅙': '1/6',
  '⅚': '5/6',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
};

// Maps many human spellings of a unit onto the canonical UnitValue used by the
// create form. Keys are compared lowercase with trailing punctuation stripped.
const UNIT_ALIASES: Record<string, UnitValue> = {
  g: 'g',
  gram: 'g',
  grams: 'g',
  gr: 'g',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  cup: 'cups',
  cups: 'cups',
  c: 'cups',
  tbsp: 'tbsp',
  tbsps: 'tbsp',
  tbs: 'tbsp',
  tb: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tsp: 'tsp',
  tsps: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  l: 'l',
  liter: 'l',
  liters: 'l',
  litre: 'l',
  litres: 'l',
  'fl oz': 'fl oz',
  floz: 'fl oz',
};

// Section header aliases. Matched against a whole line (lowercased, punctuation
// trimmed). Order within the file is irrelevant; longer/more specific phrases
// are checked first below.
const SECTION_HEADERS: Array<{ section: SectionName; aliases: string[] }> = [
  {
    section: 'ingredients',
    aliases: ['ingredients', 'ingredient list', 'what you need', 'you will need', "you'll need", 'shopping list'],
  },
  {
    section: 'method',
    aliases: [
      'method',
      'methods',
      'instructions',
      'directions',
      'direction',
      'steps',
      'preparation',
      'procedure',
      'how to make',
      'how to make it',
      'how to prepare',
      'to make',
    ],
  },
  {
    section: 'notes',
    aliases: ['notes', 'note', 'tips', 'tip', "chef's notes", 'chefs notes', 'variations', 'cooks note', "cook's notes"],
  },
  {
    section: 'description',
    aliases: ['description', 'about', 'intro', 'introduction', 'summary'],
  },
];

function expandUnicodeFractions(text: string): string {
  let result = text;
  for (const [glyph, value] of Object.entries(UNICODE_FRACTIONS)) {
    // Insert a space before the fraction when it follows a digit (e.g. "1½" -> "1 1/2").
    result = result.replace(new RegExp(`(\\d)${glyph}`, 'g'), `$1 ${value}`);
    result = result.split(glyph).join(value);
  }
  return result;
}

function stripBullet(line: string): string {
  return line.replace(/^\s*(?:[-*•‣◦·]|\d+[.)\]:]|[a-z][.)])\s+/i, '').trim();
}

function normalizeHeaderKey(line: string): string {
  return line
    .toLowerCase()
    .replace(/[:.\-–—\s]+$/g, '')
    .replace(/^[#>\-*\s]+/g, '')
    .trim();
}

function matchSectionHeader(line: string): SectionName | null {
  const trimmed = line.trim();
  // Headers are short. Anything long is almost certainly content.
  if (trimmed.length === 0 || trimmed.length > 40) return null;

  const key = normalizeHeaderKey(trimmed);
  if (!key) return null;

  for (const { section, aliases } of SECTION_HEADERS) {
    if (aliases.includes(key)) return section;
  }
  return null;
}

/**
 * Parse a single quantity token (whole number, decimal, simple fraction, or
 * mixed number like "1 1/2"). Returns null if no leading number is present.
 * Also returns how many characters were consumed so the caller can take the
 * remainder as unit + name.
 */
function parseLeadingAmount(text: string): { amount: number; rest: string } | null {
  // Mixed number: "1 1/2"
  const mixed = text.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)\b/);
  if (mixed) {
    const whole = parseInt(mixed[1], 10);
    const num = parseInt(mixed[2], 10);
    const den = parseInt(mixed[3], 10);
    const amount = den ? whole + num / den : whole;
    return { amount: round(amount), rest: text.slice(mixed[0].length).trim() };
  }

  // Simple fraction: "1/2"
  const frac = text.match(/^(\d+)\s*\/\s*(\d+)\b/);
  if (frac) {
    const num = parseInt(frac[1], 10);
    const den = parseInt(frac[2], 10);
    const amount = den ? num / den : num;
    return { amount: round(amount), rest: text.slice(frac[0].length).trim() };
  }

  // Range: "2-3" or "2 to 3" -> take the lower bound.
  const range = text.match(/^(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*\d+(?:\.\d+)?\b/);
  if (range) {
    return { amount: round(parseFloat(range[1])), rest: text.slice(range[0].length).trim() };
  }

  // Decimal or whole number, possibly with an attached unit ("200g").
  const num = text.match(/^(\d+(?:\.\d+)?)/);
  if (num) {
    return { amount: round(parseFloat(num[1])), rest: text.slice(num[0].length).trim() };
  }

  return null;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function resolveUnit(token: string): UnitValue | null {
  const key = token.toLowerCase().replace(/[.,]+$/g, '').trim();
  if (!key) return null;
  return UNIT_ALIASES[key] ?? null;
}

/**
 * Parse one ingredient line into { amount, unit, name }.
 * Falls back to amount 0 / unit "other" with the raw line as the name when the
 * line has no recognizable quantity, so the text is never lost.
 */
function parseIngredientLine(rawLine: string): { ingredient: ParsedIngredient; parsed: boolean } {
  const line = stripBullet(rawLine);
  if (!line) {
    return { ingredient: { name: '', amount: 0, unit: DEFAULT_UNIT }, parsed: false };
  }

  const amountResult = parseLeadingAmount(line);
  if (!amountResult) {
    // No quantity (e.g. "salt to taste", "a pinch of cayenne").
    return { ingredient: { name: line, amount: 0, unit: 'other' }, parsed: false };
  }

  let { amount, rest } = amountResult;

  // Attached-unit case: number ran straight into letters ("200g", "1lb").
  // parseLeadingAmount split on the number boundary, so rest may start with the
  // unit letters with no space. Detect a leading alpha token regardless.
  const unitMatch = rest.match(/^([a-zA-Z]+)\b\.?/);
  if (unitMatch) {
    const candidate = resolveUnit(unitMatch[1]);
    if (candidate) {
      const name = rest.slice(unitMatch[0].length).trim().replace(/^of\s+/i, '');
      return {
        ingredient: { name: name || rest.trim(), amount, unit: candidate },
        parsed: Boolean(name),
      };
    }
  }

  // "fl oz" is two words.
  const flOz = rest.match(/^fl\.?\s*oz\b\.?/i);
  if (flOz) {
    const name = rest.slice(flOz[0].length).trim().replace(/^of\s+/i, '');
    return { ingredient: { name: name || rest.trim(), amount, unit: 'fl oz' }, parsed: Boolean(name) };
  }

  // No recognizable unit: treat the rest as the name with no unit.
  const name = rest.replace(/^of\s+/i, '').trim();
  return { ingredient: { name: name || line, amount, unit: 'other' }, parsed: Boolean(name) };
}

function splitIntoSteps(lines: string[]): string[] {
  const nonEmpty = lines.map(l => l.trim()).filter(Boolean);
  if (nonEmpty.length === 0) return [];

  const looksNumbered = nonEmpty.some(l => /^\s*\d+[.)\]:]/.test(l));
  const looksBulleted = nonEmpty.some(l => /^\s*[-*•‣◦·]\s+/.test(l));

  if (looksNumbered || looksBulleted) {
    return nonEmpty.map(stripBullet).filter(Boolean);
  }

  // No explicit list markers: each non-empty line is its own step. This matches
  // how most pasted instruction blocks are formatted (one step per line).
  return nonEmpty;
}

function extractTimeMinutes(text: string): number | null {
  // Supports "1 hr 30 min", "90 minutes", "1.5 hours", "45 mins".
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
  const minMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|min|m)\b/i);

  let total = 0;
  let found = false;
  if (hourMatch) {
    total += parseFloat(hourMatch[1]) * 60;
    found = true;
  }
  if (minMatch) {
    total += parseFloat(minMatch[1]);
    found = true;
  }
  if (!found) {
    // Bare number after a time label, e.g. "Prep: 15".
    const bare = text.match(/(\d+)/);
    if (bare) return Math.round(parseFloat(bare[1]));
    return null;
  }
  return Math.round(total);
}

export function parseRecipeText(raw: string): ParsedRecipeDraft {
  const warnings: string[] = [];

  const draft: ParsedRecipeDraft = {
    title: '',
    description: '',
    tags: '',
    servings: '',
    prepTime: '',
    cookTime: '',
    ingredients: [],
    methodSteps: [],
    notes: [],
    warnings,
  };

  if (!raw || !raw.trim()) {
    warnings.push('No text was provided to parse.');
    return draft;
  }

  // Preprocess: normalize newlines, fix mojibake, expand unicode fractions.
  const cleaned = expandUnicodeFractions(
    fixSpecialCharacters(raw.replace(/\r\n?/g, '\n'))
  );

  const allLines = cleaned.split('\n').map(l => l.replace(/\s+$/g, ''));

  // Partition the lines into a preamble (before any section header) and the
  // section buckets.
  const preamble: string[] = [];
  const buckets: Record<SectionName, string[]> = {
    description: [],
    ingredients: [],
    method: [],
    notes: [],
  };

  let current: SectionName | null = null;
  let sawAnyHeader = false;

  for (const line of allLines) {
    const header = matchSectionHeader(line);
    if (header) {
      current = header;
      sawAnyHeader = true;
      continue;
    }
    if (current) {
      buckets[current].push(line);
    } else {
      preamble.push(line);
    }
  }

  // --- Metadata + title from the preamble ---
  const preambleNonEmpty = preamble.map(l => l.trim()).filter(Boolean);

  const metadataLabelRegex =
    /^(serv(?:es|ings?)|yield|makes|prep(?:aration)?(?:\s*time)?|cook(?:ing)?(?:\s*time)?|bake(?:\s*time)?|total(?:\s*time)?|ready in|time|tags?|keywords?|title|recipe|by|author|course|cuisine|category)\b/i;

  const consumedPreamble = new Set<number>();

  // Metadata lives in the leading block, before any ingredient/step content.
  // Stopping there prevents false matches like the verb "cook" inside a method
  // sentence ("Pour and cook for 3 minutes") when there are no section headers.
  const isContentLine = (line: string) =>
    parseLeadingAmount(stripBullet(line)) !== null ||
    /^\s*\d+[.)\]:]/.test(line) ||
    /^\s*[-*•‣◦·]\s+/.test(line);
  let metadataCutoff = preambleNonEmpty.findIndex(isContentLine);
  if (metadataCutoff === -1) metadataCutoff = preambleNonEmpty.length;

  // Each metadata field is scanned independently and anywhere within a line so
  // inline, pipe/bullet-separated headers like "Serves 8 | Prep: 15 min | Cook:
  // 1 hour" are fully captured.
  preambleNonEmpty.forEach((line, idx) => {
    if (idx >= metadataCutoff) return;
    let matchedSomething = false;

    if (!draft.servings) {
      const m = line.match(/\b(?:serv(?:es|ings?)|yields?|makes)\b\s*[:\-]?\s*(\d+)/i);
      if (m) {
        draft.servings = m[1];
        matchedSomething = true;
      }
    }

    if (!draft.prepTime) {
      const m = line.match(/\bprep(?:aration)?(?:\s*time)?\b\s*[:\-]?\s*([^|•\n]+)/i);
      if (m) {
        const mins = extractTimeMinutes(m[1]);
        if (mins != null) {
          draft.prepTime = String(mins);
          matchedSomething = true;
        }
      }
    }

    if (!draft.cookTime) {
      const m = line.match(/\b(?:cook(?:ing)?|bak(?:e|ing))(?:\s*time)?\b\s*[:\-]?\s*([^|•\n]+)/i);
      if (m) {
        const mins = extractTimeMinutes(m[1]);
        if (mins != null) {
          draft.cookTime = String(mins);
          matchedSomething = true;
        }
      }
    }

    if (!draft.cookTime && !draft.prepTime) {
      const m = line.match(/\b(?:total(?:\s*time)?|ready in)\b\s*[:\-]?\s*([^|•\n]+)/i);
      if (m) {
        const mins = extractTimeMinutes(m[1]);
        if (mins != null) {
          // Only a total is given: park it in cook time so total-time displays work.
          draft.cookTime = String(mins);
          matchedSomething = true;
        }
      }
    }

    if (!draft.tags) {
      const m = line.match(/^\s*(?:tags?|keywords?)\b\s*[:\-]?\s*(.+)$/i);
      if (m) {
        draft.tags = m[1]
          .split(/[,;|]/)
          .map(t => t.trim())
          .filter(Boolean)
          .join(', ');
        if (draft.tags) matchedSomething = true;
      }
    }

    if (!draft.title) {
      const m = line.match(/^\s*(?:title|recipe)\s*[:\-]\s*(.+)$/i);
      if (m && m[1].trim()) {
        draft.title = m[1].trim();
        matchedSomething = true;
      }
    }

    // Only treat the line as fully consumed when it is a pure metadata line
    // (i.e. nothing but recognized labels). Lines that also contain the title
    // are handled by the title fallback below.
    if (matchedSomething && metadataLabelRegex.test(line.trim())) {
      consumedPreamble.add(idx);
    }
  });

  // Title fallback: first preamble line that isn't a consumed metadata label.
  if (!draft.title) {
    for (let i = 0; i < preambleNonEmpty.length; i++) {
      const line = preambleNonEmpty[i];
      if (consumedPreamble.has(i)) continue;
      if (metadataLabelRegex.test(line)) continue;
      if (line.length <= 80) {
        draft.title = line.replace(/[#*]+/g, '').trim();
        consumedPreamble.add(i);
        if (!sawAnyHeader) warnings.push('Used the first line as the recipe title.');
        break;
      }
    }
  }

  // Remaining un-consumed preamble lines become description candidates, but
  // only if we have no dedicated description section.
  const leftoverPreamble = preambleNonEmpty.filter((_, i) => !consumedPreamble.has(i));

  // --- Description ---
  const descLines = buckets.description.map(l => l.trim()).filter(Boolean);
  if (descLines.length > 0) {
    draft.description = descLines.join('\n');
  } else if (!sawAnyHeader && leftoverPreamble.length > 0) {
    // Without headers we can't reliably tell description from stray lines, so
    // leave description empty and let leftover lines fall through to notes.
  }

  // --- Ingredients ---
  let ingredientSource = buckets.ingredients;

  // Fallback when no Ingredients header was present: detect quantity-led lines
  // in the leftover preamble.
  if (ingredientSource.length === 0 && !sawAnyHeader) {
    const looksLikeIngredient = (l: string) =>
      parseLeadingAmount(stripBullet(l)) !== null ||
      /\b(cups?|tbsp|tsp|tablespoons?|teaspoons?|grams?|g|kg|oz|ounces?|lb|pounds?|ml|l)\b/i.test(l);
    ingredientSource = leftoverPreamble.filter(looksLikeIngredient);
  }

  let unparsedIngredientCount = 0;
  for (const line of ingredientSource) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const { ingredient, parsed } = parseIngredientLine(trimmed);
    if (!ingredient.name) continue;
    if (!parsed) unparsedIngredientCount++;
    draft.ingredients.push(ingredient);
  }

  if (draft.ingredients.length === 0) {
    warnings.push('No ingredients were detected. Add them manually below.');
  } else if (unparsedIngredientCount > 0) {
    warnings.push(
      `${unparsedIngredientCount} ingredient ${
        unparsedIngredientCount === 1 ? 'line' : 'lines'
      } could not be fully split into amount/unit/name. Please double-check them.`
    );
  }

  // --- Method ---
  let methodSource = buckets.method;
  if (methodSource.length === 0 && !sawAnyHeader) {
    // Without headers, treat numbered/bulleted leftover lines as steps.
    const ingredientSet = new Set(ingredientSource);
    methodSource = leftoverPreamble.filter(
      l => !ingredientSet.has(l) && (/^\s*\d+[.)\]:]/.test(l) || /^\s*[-*•‣◦·]\s+/.test(l))
    );
  }
  draft.methodSteps = splitIntoSteps(methodSource).map(fixSpecialCharacters);

  if (draft.methodSteps.length === 0) {
    warnings.push('No method steps were detected. Add them manually below.');
  }

  // --- Notes ---
  const noteLines = buckets.notes.map(l => l.trim()).filter(Boolean);
  draft.notes = splitIntoSteps(noteLines).map(fixSpecialCharacters);

  // Leftover preamble lines that weren't used anywhere (and no headers) get
  // parked in notes so nothing is silently dropped.
  if (!sawAnyHeader) {
    const usedAsIngredient = new Set(ingredientSource);
    const usedAsMethod = new Set(methodSource);
    const orphans = leftoverPreamble.filter(
      l => !usedAsIngredient.has(l) && !usedAsMethod.has(l) && l !== draft.title
    );
    if (orphans.length > 0 && draft.methodSteps.length === 0 && draft.ingredients.length === 0) {
      // Truly unstructured paste: put everything into steps so it is visible.
      draft.methodSteps = orphans.map(fixSpecialCharacters);
    }
  }

  return draft;
}
