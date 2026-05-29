import type { TemperatureUnitValue } from '@/lib/temperature-config';

/** Viewer preference: null = signed out (show all conversions). */
export type ViewerTemperaturePreference = TemperatureUnitValue | null;

export const TEMPERATURE_REGEX =
  /(\d+(?:\.\d+)?)\s*(?:°|º|˚)?\s*([fc])\b/gi;

export interface TemperatureMatch {
  matchText: string;
  value: number;
  unit: TemperatureUnitValue;
}

export function celsiusToFahrenheit(c: number): number {
  return c * (9 / 5) + 32;
}

export function fahrenheitToCelsius(f: number): number {
  return (f - 32) * (5 / 9);
}

export function formatConvertedTemp(value: number): string {
  return String(Math.round(value));
}

export function convertTemperature(
  value: number,
  from: TemperatureUnitValue
): { value: number; unit: TemperatureUnitValue } {
  if (from === 'C') {
    return { value: celsiusToFahrenheit(value), unit: 'F' };
  }
  return { value: fahrenheitToCelsius(value), unit: 'C' };
}

export function shouldShowConversion(
  detectedUnit: TemperatureUnitValue,
  viewer: ViewerTemperaturePreference
): boolean {
  if (viewer === null) return true;
  if (viewer === 'C') return detectedUnit === 'F';
  return detectedUnit === 'C';
}

export function formatConversionHint(
  detectedUnit: TemperatureUnitValue,
  value: number
): string {
  const converted = convertTemperature(value, detectedUnit);
  const formatted = formatConvertedTemp(converted.value);
  return `(${formatted}°${converted.unit})`;
}

export function findTemperatureMatches(text: string): TemperatureMatch[] {
  const matches: TemperatureMatch[] = [];
  TEMPERATURE_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = TEMPERATURE_REGEX.exec(text)) !== null) {
    const [matchText, numStr, unitLetter] = match;
    const unit = unitLetter.toUpperCase() as TemperatureUnitValue;
    matches.push({
      matchText,
      value: parseFloat(numStr),
      unit,
    });
  }

  return matches;
}
