/**
 * Temperature unit preference configuration.
 * Used for profile defaults and recipe step temperature conversions.
 */

export const DEFAULT_TEMPERATURE_UNIT = 'C' as const;

export type TemperatureUnitValue = 'C' | 'F';

export interface TemperatureOption {
  value: TemperatureUnitValue;
  label: string;
}

export const TEMPERATURE_OPTIONS: TemperatureOption[] = [
  { value: 'C', label: 'Celsius' },
  { value: 'F', label: 'Fahrenheit' },
];
