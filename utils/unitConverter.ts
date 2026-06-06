/**
 * UNIT CONVERSION UTILITIES
 *
 * Handles conversion between volume and weight measurements for ingredients.
 * Uses ingredient-specific density data for accurate conversions.
 */

// Ingredient density data (grams per milliliter)
export const INGREDIENT_DENSITIES: Record<string, number> = {
  // Flours & starches
  'flour': 0.5,
  'all-purpose flour': 0.5,
  'bread flour': 0.53,
  'cake flour': 0.45,
  'whole wheat flour': 0.54,
  'almond flour': 0.4,
  'coconut flour': 0.51,
  'rye flour': 0.46,
  'oat flour': 0.4,
  'rice flour': 0.63,
  'self-rising flour': 0.5,
  'semolina': 0.68,
  'cornmeal': 0.6,
  'cornstarch': 0.54,
  'tapioca starch': 0.52,
  // Sugars & syrups
  'sugar': 0.85,
  'granulated sugar': 0.85,
  'brown sugar': 0.9,
  'dark brown sugar': 0.93,
  'powdered sugar': 0.56,
  'raw sugar': 0.88,
  'coconut sugar': 0.8,
  'honey': 1.42,
  'maple syrup': 1.33,
  'corn syrup': 1.38,
  'agave syrup': 1.34,
  'molasses': 1.4,
  'golden syrup': 1.43,
  // Liquids & dairy
  'water': 1.0,
  'milk': 1.03,
  'buttermilk': 1.03,
  'heavy cream': 0.99,
  'half-and-half': 1.01,
  'coconut milk': 0.97,
  'almond milk': 1.03,
  'soy milk': 1.03,
  'condensed milk': 1.29,
  'sour cream': 1.0,
  'yogurt': 1.03,
  'cream cheese': 1.0,
  // Fats & oils
  'oil': 0.92,
  'vegetable oil': 0.92,
  'olive oil': 0.92,
  'coconut oil': 0.92,
  'butter': 0.96,
  'salted butter': 0.96,
  'shortening': 0.95,
  'lard': 0.92,
  'peanut butter': 1.09,
  'tahini': 1.07,
  // Leaveners, salts & spices
  'salt': 1.22,
  'table salt': 1.22,
  'kosher salt': 0.8,
  'sea salt': 0.8,
  'baking powder': 0.96,
  'baking soda': 2.2,
  'yeast': 0.7,
  'cream of tartar': 0.92,
  'cocoa powder': 0.48,
  'cinnamon': 0.45,
  'nutmeg': 0.5,
  'black pepper': 0.5,
  'garlic powder': 0.55,
  'onion powder': 0.45,
  'paprika': 0.46,
  'cumin': 0.45,
  'turmeric': 0.6,
  'cayenne': 0.46,
  'chili powder': 0.42,
  'vanilla extract': 0.88,
  // Grains & legumes
  'rice': 0.85,
  'brown rice': 0.81,
  'oats': 0.41,
  'quick oats': 0.4,
  'quinoa': 0.74,
  'lentils': 0.85,
  'chickpeas': 0.8,
  'black beans': 0.8,
  'kidney beans': 0.8,
  'white beans': 0.8,
  'soybeans': 0.8,
  'tofu': 0.8,
  'edamame': 0.8,
  // Nuts & seeds
  'almonds': 0.6,
  'walnuts': 0.5,
  'pecans': 0.46,
  'cashews': 0.55,
  'peanuts': 0.62,
  'sesame seeds': 0.6,
  'chia seeds': 0.66,
  'flaxseeds': 0.56,
  'pumpkin seeds': 0.55,
  // Other
  'breadcrumbs': 0.43,
  'panko': 0.21,
  'chocolate chips': 0.72,
  'protein powder': 0.4,
  // Default for unknown ingredients
  'default': 1.0
};

// Ingredient aliases: maps a normalized synonym/variant to a canonical key in INGREDIENT_DENSITIES.
// Keys here should already be in normalized form (lowercase, spaces, no hyphens/punctuation).
export const INGREDIENT_ALIASES: Record<string, string> = {
  // Sugars
  'white sugar': 'granulated sugar',
  'caster sugar': 'granulated sugar',
  'castor sugar': 'granulated sugar',
  'superfine sugar': 'granulated sugar',
  'icing sugar': 'powdered sugar',
  'confectioners sugar': 'powdered sugar',
  'confectioner sugar': 'powdered sugar',
  'turbinado sugar': 'raw sugar',
  'demerara sugar': 'raw sugar',
  'light brown sugar': 'brown sugar',
  'dark brown sugar': 'dark brown sugar',
  // Flours
  'plain flour': 'all-purpose flour',
  'all purpose flour': 'all-purpose flour',
  'ap flour': 'all-purpose flour',
  'self raising flour': 'self-rising flour',
  'self rising flour': 'self-rising flour',
  'wholewheat flour': 'whole wheat flour',
  'wholemeal flour': 'whole wheat flour',
  'corn flour': 'cornstarch',
  'cornflour': 'cornstarch',
  'corn starch': 'cornstarch',
  'corn meal': 'cornmeal',
  // Oils & fats
  'canola oil': 'vegetable oil',
  'sunflower oil': 'vegetable oil',
  'rapeseed oil': 'vegetable oil',
  'extra virgin olive oil': 'olive oil',
  'evoo': 'olive oil',
  // Dairy
  'whole milk': 'milk',
  'skim milk': 'milk',
  'skimmed milk': 'milk',
  'low fat milk': 'milk',
  'whipping cream': 'heavy cream',
  'double cream': 'heavy cream',
  'greek yogurt': 'yogurt',
  'plain yogurt': 'yogurt',
  // Leaveners & spices
  'bicarbonate of soda': 'baking soda',
  'bicarb': 'baking soda',
  'sodium bicarbonate': 'baking soda',
  'table salt': 'salt',
  'sea salt': 'salt',
  'active dry yeast': 'yeast',
  'instant yeast': 'yeast',
  'cacao powder': 'cocoa powder',
  'unsweetened cocoa powder': 'cocoa powder',
  'ground cinnamon': 'cinnamon',
  'ground nutmeg': 'nutmeg',
  'ground cumin': 'cumin',
  'vanilla essence': 'vanilla extract',
  // Nuts & seeds
  'flax seeds': 'flaxseeds',
  'linseeds': 'flaxseeds',
  'ground almonds': 'almond flour',
  // Other
  'bread crumbs': 'breadcrumbs',
  'choc chips': 'chocolate chips',
  'chocolate chip': 'chocolate chips'
};

// Volume unit conversions to milliliters
export const VOLUME_UNITS: Record<string, number> = {
  'ml': 1,
  'milliliter': 1,
  'milliliters': 1,
  'tsp': 5,
  'teaspoon': 5,
  'teaspoons': 5,
  'tbsp': 15,
  'tablespoon': 15,
  'tablespoons': 15,
  'cup': 250,
  'cups': 250,
  'us cup': 250,
  'us cups': 250,
  'fl oz': 30,
  'fluid ounce': 30,
  'fluid ounces': 30,
  'pt': 500,
  'pint': 500,
  'pints': 500,
  'qt': 1000,
  'quart': 1000,
  'quarts': 1000,
  'l': 1000,
  'liter': 1000,
  'liters': 1000
};

/**
 * Normalize an ingredient name for matching.
 * Lowercases, trims, collapses whitespace, and strips hyphens/punctuation.
 *
 * @param name - Raw ingredient name
 * @returns Normalized string (e.g. "  All-Purpose  Flour " -> "all purpose flour")
 */
export function normalizeIngredient(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[-_]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compute the Levenshtein edit distance between two strings.
 * Used for typo-tolerant ingredient matching. No external dependencies.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Minimum number of single-character edits to turn a into b
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  let currentRow = new Array<number>(b.length + 1);

  for (let i = 0; i < a.length; i++) {
    currentRow[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      currentRow[j + 1] = Math.min(
        currentRow[j] + 1,        // insertion
        previousRow[j + 1] + 1,   // deletion
        previousRow[j] + cost     // substitution
      );
    }
    [previousRow, currentRow] = [currentRow, previousRow];
  }

  return previousRow[b.length];
}

/**
 * Resolve a normalized name to a canonical density key, following the alias map.
 */
function resolveCanonicalKey(normalized: string): string {
  return INGREDIENT_ALIASES[normalized] || normalized;
}

/**
 * Find the density for an ingredient using a tolerant lookup chain:
 *   1. Exact match against INGREDIENT_DENSITIES
 *   2. Alias lookup (synonyms/variants) -> canonical key
 *   3. Substring match (input contains a key, or a key contains the input)
 *   4. Levenshtein fuzzy match (handles typos)
 *   5. Fallback to the 'default' density
 *
 * @param ingredient - Raw ingredient name (may contain typos, extra spaces, capitals)
 * @returns Density in grams per milliliter
 */
export function findIngredientDensity(ingredient: string): number {
  const normalized = normalizeIngredient(ingredient);

  if (!normalized) {
    return INGREDIENT_DENSITIES['default'];
  }

  // 1. Exact match
  if (INGREDIENT_DENSITIES[normalized] !== undefined) {
    return INGREDIENT_DENSITIES[normalized];
  }

  // 2. Alias lookup -> canonical key (canonical keys may contain hyphens)
  if (INGREDIENT_ALIASES[normalized] !== undefined) {
    const canonical = INGREDIENT_ALIASES[normalized];
    if (INGREDIENT_DENSITIES[canonical] !== undefined) {
      return INGREDIENT_DENSITIES[canonical];
    }
    // canonical may itself be in normalized form; try a normalized variant too
    const normalizedCanonical = normalizeIngredient(canonical);
    if (INGREDIENT_DENSITIES[normalizedCanonical] !== undefined) {
      return INGREDIENT_DENSITIES[normalizedCanonical];
    }
  }

  // Build a set of candidate keys (density keys + alias keys) in normalized form,
  // mapped back to a density value, for substring and fuzzy matching.
  const candidates: { key: string; density: number }[] = [];

  for (const key of Object.keys(INGREDIENT_DENSITIES)) {
    if (key === 'default') continue;
    candidates.push({ key: normalizeIngredient(key), density: INGREDIENT_DENSITIES[key] });
  }
  for (const aliasKey of Object.keys(INGREDIENT_ALIASES)) {
    const canonical = resolveCanonicalKey(aliasKey);
    const density =
      INGREDIENT_DENSITIES[canonical] ?? INGREDIENT_DENSITIES[normalizeIngredient(canonical)];
    if (density !== undefined) {
      candidates.push({ key: normalizeIngredient(aliasKey), density });
    }
  }

  // 3. Substring match: prefer the longest matching key for specificity.
  let bestSubstring: { key: string; density: number } | null = null;
  for (const candidate of candidates) {
    if (candidate.key.length < 3) continue;
    if (normalized.includes(candidate.key) || candidate.key.includes(normalized)) {
      if (!bestSubstring || candidate.key.length > bestSubstring.key.length) {
        bestSubstring = candidate;
      }
    }
  }
  if (bestSubstring) {
    return bestSubstring.density;
  }

  // 4. Levenshtein fuzzy match: tolerate typos, scaled by word length.
  let bestFuzzy: { density: number; distance: number } | null = null;
  for (const candidate of candidates) {
    const maxDistance = candidate.key.length <= 6 ? 2 : 3;
    const distance = levenshtein(normalized, candidate.key);
    if (distance <= maxDistance) {
      if (!bestFuzzy || distance < bestFuzzy.distance) {
        bestFuzzy = { density: candidate.density, distance };
      }
    }
  }
  if (bestFuzzy) {
    return bestFuzzy.density;
  }

  // 5. Fallback
  return INGREDIENT_DENSITIES['default'];
}

/**
 * Convert volume to weight
 *
 * @param amount - Volume amount
 * @param volumeUnit - Unit (cup, tsp, ml, etc.)
 * @param ingredient - Ingredient name
 * @returns Weight in grams
 */
export function volumeToWeight(amount: number, volumeUnit: string, ingredient: string): number {
  // Get milliliter conversion
  const mlPerUnit = VOLUME_UNITS[volumeUnit.toLowerCase()] || 1;
  const totalMl = amount * mlPerUnit;
  
  // Get ingredient density (tolerant lookup handles typos, aliases, spacing)
  const density = findIngredientDensity(ingredient);
  
  // Calculate weight (grams = ml * density)
  return totalMl * density;
}

/**
 * Convert weight to volume
 *
 * @param grams - Weight in grams
 * @param targetUnit - Desired volume unit
 * @param ingredient - Ingredient name
 * @returns Volume in target unit
 */
export function weightToVolume(grams: number, targetUnit: string, ingredient: string): number {
  // Get ingredient density (tolerant lookup handles typos, aliases, spacing)
  const density = findIngredientDensity(ingredient);
  
  // Calculate milliliters (ml = grams / density)
  const ml = grams / density;
  
  // Convert to target unit
  const mlPerUnit = VOLUME_UNITS[targetUnit.toLowerCase()] || 1;
  return ml / mlPerUnit;
}

/**
 * Format measurement display
 *
 * @param amount - Measurement amount
 * @param unit - Unit of measurement
 * @returns Formatted string (e.g., "2 cups", "150 g")
 */
export function formatMeasurement(amount: number, unit: string): string {
  // Round to 2 decimal places
  const rounded = Math.round(amount * 100) / 100;
  
  // Handle singular vs plural
  let formattedUnit = unit;
  if (rounded === 1 && unit.endsWith('s')) {
    formattedUnit = unit.slice(0, -1); // Remove 's' for singular
  }
  
  return `${rounded} ${formattedUnit}`;
}

/**
 * Convert ingredient from one unit to another
 * 
 * @param amount - Current amount
 * @param fromUnit - Current unit
 * @param toUnit - Target unit
 * @param ingredient - Ingredient name
 * @returns Converted amount in target unit
 */
export function convertUnit(
  amount: number,
  fromUnit: string,
  toUnit: string,
  ingredient: string
): number {
  // If units are the same, return as-is
  if (fromUnit.toLowerCase() === toUnit.toLowerCase()) {
    return amount;
  }
  
  // Convert to grams first (if fromUnit is volume)
  const isFromVolume = VOLUME_UNITS[fromUnit.toLowerCase()] !== undefined;
  const isToVolume = VOLUME_UNITS[toUnit.toLowerCase()] !== undefined;
  
  if (isFromVolume && isToVolume) {
    // Both are volume units - direct conversion
    const fromMl = amount * (VOLUME_UNITS[fromUnit.toLowerCase()] || 1);
    const toMlPerUnit = VOLUME_UNITS[toUnit.toLowerCase()] || 1;
    return fromMl / toMlPerUnit;
  } else if (isFromVolume && !isToVolume) {
    // Volume to weight
    const grams = volumeToWeight(amount, fromUnit, ingredient);
    // If toUnit is 'g' or 'gram', return grams
    if (toUnit.toLowerCase() === 'g' || toUnit.toLowerCase() === 'gram' || toUnit.toLowerCase() === 'grams') {
      return grams;
    }
    // Otherwise, assume it's a weight unit we don't handle
    return grams;
  } else if (!isFromVolume && isToVolume) {
    // Weight to volume
    // Assume fromUnit is grams
    return weightToVolume(amount, toUnit, ingredient);
  } else {
    // Both are weight units (or unknown) - return as-is
    return amount;
  }
}

