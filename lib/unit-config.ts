/**
 * Unit of Measurement Configuration
 *
 * Defines available units for recipe ingredients.
 * Used for user default preference and recipe creation.
 */

export const DEFAULT_UNIT = 'cups' as const;

export type UnitValue =
  | 'g'
  | 'kg'
  | 'oz'
  | 'lb'
  | 'cups'
  | 'tbsp'
  | 'tsp'
  | 'ml'
  | 'fl oz'
  | 'l'
  | 'other';

export interface UnitOption {
  value: UnitValue;
  label: string;
  group: 'weight-metric' | 'weight-imperial' | 'volume' | 'other';
}

export const UNIT_OPTIONS: UnitOption[] = [
  { value: 'g', label: 'g (grams)', group: 'weight-metric' },
  { value: 'kg', label: 'kg (kilograms)', group: 'weight-metric' },
  { value: 'oz', label: 'oz (ounces)', group: 'weight-imperial' },
  { value: 'lb', label: 'lb (pounds)', group: 'weight-imperial' },
  { value: 'cups', label: 'cups', group: 'volume' },
  { value: 'tbsp', label: 'tbsp (tablespoon)', group: 'volume' },
  { value: 'tsp', label: 'tsp (teaspoon)', group: 'volume' },
  { value: 'ml', label: 'ml (milliliters)', group: 'volume' },
  { value: 'fl oz', label: 'fl oz (fluid ounces)', group: 'volume' },
  { value: 'l', label: 'l (liters)', group: 'volume' },
  { value: 'other', label: 'Other', group: 'other' },
];

export const UNIT_GROUPS = {
  'Weight - Metric': 'weight-metric' as const,
  'Weight - Imperial': 'weight-imperial' as const,
  Volume: 'volume' as const,
  Other: 'other' as const,
};
