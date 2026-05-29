/**
 * Nutrition Estimator
 *
 * Rough, build-time-only estimation of recipe nutrition from a small static
 * lookup table (`data/nutrition.json`, per 100 g, sourced from USDA FoodData
 * Central). This is intentionally approximate: ingredient names are free text,
 * densities and cooking losses are ignored, and many ingredients will not be
 * found in the table. Always present results as estimates, never as exact.
 *
 * No runtime fetching happens here. The lookup table is imported statically so
 * it is bundled at build time. Extend coverage by editing `data/nutrition.json`.
 */

import nutritionData from '@/data/nutrition.json';

export interface Nutrition {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
}

export interface RecipeNutritionResult {
  total: Nutrition;
  perServing: Nutrition | null; // null if servings is unknown
  coverage: number; // 0..1 — fraction of recipe mass we could account for
  unmatched: string[];
}

type NutritionTable = Record<string, Nutrition>;

/**
 * Leading descriptive words that should be stripped before matching. These do
 * not change which ingredient is being referenced ("fresh basil" -> "basil").
 */
const LEADING_ADJECTIVES = new Set<string>([
  'fresh', 'ripe', 'chopped', 'diced', 'sliced', 'minced', 'grated', 'shredded',
  'crushed', 'ground', 'whole', 'large', 'small', 'medium', 'raw', 'cooked',
  'dried', 'dry', 'frozen', 'canned', 'tinned', 'organic', 'peeled', 'boneless',
  'skinless', 'fine', 'finely', 'roughly', 'coarsely', 'cold', 'warm', 'hot',
  'softened', 'melted', 'unsalted', 'salted', 'lean', 'extra', 'light', 'low',
  'free', 'range', 'plain', 'pure', 'toasted', 'roasted', 'smoked', 'mashed',
  'cubed', 'halved', 'quartered', 'thinly', 'thickly', 'firm', 'soft', 'mature',
  'young', 'baby', 'wild', 'sweet',
]);

// Build a clean table that excludes metadata keys (anything starting with "_").
const TABLE: NutritionTable = Object.fromEntries(
  Object.entries(nutritionData as Record<string, unknown>).filter(
    ([key]) => !key.startsWith('_')
  )
) as NutritionTable;

// Match longer (more specific) keys first so "bell pepper" wins over "pepper".
const SORTED_KEYS = Object.keys(TABLE).sort((a, b) => b.length - a.length);

const ZERO: Nutrition = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0 };

/**
 * Normalise an ingredient name for lookup:
 * - lowercase + trim
 * - drop parenthetical notes, e.g. "butter (softened)" -> "butter"
 * - drop trailing clauses after a comma, e.g. "flour, sifted" -> "flour"
 * - remove punctuation (keeping hyphens that join words)
 * - strip leading descriptive adjectives ("finely chopped fresh basil" -> "basil")
 */
export function normalizeIngredientName(raw: string): string {
  let name = (raw || '').toLowerCase().trim();
  name = name.replace(/\([^)]*\)/g, ' '); // remove parentheticals
  name = name.replace(/,.*$/, ' '); // drop everything after the first comma
  name = name.replace(/[^a-z0-9\s-]/g, ' '); // keep letters, digits, spaces, hyphens
  name = name.replace(/\s+/g, ' ').trim();

  let words = name.split(' ').filter(Boolean);
  while (words.length > 1 && LEADING_ADJECTIVES.has(words[0])) {
    words = words.slice(1);
  }
  return words.join(' ').trim();
}

/**
 * Test whether a table key matches a normalised name. Matches the key as a
 * whole word/phrase (so "egg" does not match "eggplant"), and tolerates simple
 * plural suffixes ("onion" matches "onions", "tomato" matches "tomatoes").
 */
function keyMatches(normalized: string, key: string): boolean {
  if (normalized === key) return true;
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|\\s)${escaped}(es|s)?(\\s|$)`);
  return re.test(normalized);
}

/**
 * Look up a single ingredient name in the table. Tries an exact normalised
 * match first, then a longest whole-word contains-match.
 */
export function lookupIngredient(name: string): Nutrition | null {
  const normalized = normalizeIngredientName(name);
  if (!normalized) return null;

  if (TABLE[normalized]) return TABLE[normalized];

  for (const key of SORTED_KEYS) {
    if (keyMatches(normalized, key)) {
      return TABLE[key];
    }
  }
  return null;
}

function roundNutrition(n: Nutrition): Nutrition {
  const round1 = (v: number) => Math.round(v * 10) / 10;
  return {
    kcal: Math.round(n.kcal),
    protein_g: round1(n.protein_g),
    carbs_g: round1(n.carbs_g),
    fat_g: round1(n.fat_g),
    fibre_g: round1(n.fibre_g),
  };
}

/**
 * Estimate the nutrition of a whole recipe from its ingredient masses.
 *
 * @param ingredients list of { name, amount_grams }
 * @param servings    number of servings, or null if unknown
 */
export function estimateRecipeNutrition(
  ingredients: Array<{ name: string; amount_grams: number }>,
  servings: number | null
): RecipeNutritionResult {
  const total: Nutrition = { ...ZERO };
  const unmatched: string[] = [];
  let totalMass = 0;
  let matchedMass = 0;

  for (const ingredient of ingredients || []) {
    const grams = Number(ingredient?.amount_grams);
    if (!Number.isFinite(grams) || grams <= 0) continue;

    totalMass += grams;

    const match = lookupIngredient(ingredient?.name ?? '');
    if (!match) {
      const label = (ingredient?.name ?? '').trim();
      if (label) unmatched.push(label);
      continue;
    }

    matchedMass += grams;
    const factor = grams / 100;
    total.kcal += match.kcal * factor;
    total.protein_g += match.protein_g * factor;
    total.carbs_g += match.carbs_g * factor;
    total.fat_g += match.fat_g * factor;
    total.fibre_g += match.fibre_g * factor;
  }

  const coverage = totalMass > 0 ? matchedMass / totalMass : 0;

  const validServings =
    servings != null && Number.isFinite(servings) && servings > 0 ? servings : null;

  const perServing =
    validServings != null
      ? roundNutrition({
          kcal: total.kcal / validServings,
          protein_g: total.protein_g / validServings,
          carbs_g: total.carbs_g / validServings,
          fat_g: total.fat_g / validServings,
          fibre_g: total.fibre_g / validServings,
        })
      : null;

  return {
    total: roundNutrition(total),
    perServing,
    coverage,
    unmatched,
  };
}
