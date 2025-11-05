/**
* UNIT CONVERSION UTILITIES
*
* Handles conversion between volume and weight measurements for ingredients.
* Uses ingredient-specific density data for accurate conversions.
*/
// Ingredient density data (grams per milliliter)
export const INGREDIENT_DENSITIES = {
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
export const VOLUME_UNITS = {
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
* @param {number} amount - Volume amount
* @param {string} volumeUnit - Unit (cup, tsp, ml, etc.)
* @param {string} ingredient - Ingredient name
* @returns {number} Weight in grams
*/
export function volumeToWeight(amount, volumeUnit, ingredient) {
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
* @param {number} grams - Weight in grams
* @param {string} targetUnit - Desired volume unit
* @param {string} ingredient - Ingredient name
* @returns {number} Volume in target unit
*/
export function weightToVolume(grams, targetUnit, ingredient) {
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
* @param {number} amount - Measurement amount
* @param {string} unit - Unit of measurement
* @returns {string} Formatted string (e.g., "2 cups", "150 g")
*/
export function formatMeasurement(amount, unit) {
// Round to 2 decimal places
const rounded = Math.round(amount * 100) / 100;
// Handle singular vs plural
if (rounded === 1 && unit.endsWith('s')) {
unit = unit.slice(0, -1); // Remove 's' for singular
}
return `${rounded} ${unit}`;
}