/**
 * UNIT CONVERSION UTILITIES
 *
 * Handles conversion between volume and weight measurements for ingredients.
 * Uses ingredient-specific density data for accurate conversions.
 */

// Ingredient density data (grams per milliliter)
export const INGREDIENT_DENSITIES: Record<string, number> = {
  // Flours
  'flour': 0.5,
  'all-purpose flour': 0.5,
  'bread flour': 0.53,
  'cake flour': 0.45,
  'whole wheat flour': 0.54,
  // Sugars
  'sugar': 0.85,
  'granulated sugar': 0.85,
  'brown sugar': 0.9,
  'powdered sugar': 0.56,
  // Liquids
  'water': 1.0,
  'milk': 1.03,
  'oil': 0.92,
  'honey': 1.42,
  'butter': 0.96,
  // Common ingredients
  'salt': 1.22,
  'baking powder': 0.96,
  'baking soda': 2.2,
  'cocoa powder': 0.48,
  'rice': 0.85,
  'oats': 0.41,
  // Default for unknown ingredients
  'default': 1.0
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
  
  // Get ingredient density
  const ingredientKey = ingredient.toLowerCase();
  const density = INGREDIENT_DENSITIES[ingredientKey] || INGREDIENT_DENSITIES['default'];
  
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
  // Get ingredient density
  const ingredientKey = ingredient.toLowerCase();
  const density = INGREDIENT_DENSITIES[ingredientKey] || INGREDIENT_DENSITIES['default'];
  
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

