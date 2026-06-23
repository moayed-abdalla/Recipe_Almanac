/**
 * Recipe Print View
 *
 * A dedicated, print-optimised single-recipe layout served at
 * `/recipe/[id]/print`. It mirrors the visual identity of the almanac PDF
 * export (theme primary colour, Special Elite headings, Arial body, themed
 * kitchen-icon background with the same opacity correction) and renders only
 * the recipe content — no site header, footer, background masks or buttons
 * (those are removed from printed output by the `@media print` rules in
 * `globals.css`).
 *
 * The currently-applied scale multiplier and per-ingredient unit choices are
 * passed in from the URL search params (decoded server-side), so the printed
 * amounts match exactly what the user was looking at on the recipe page.
 */

'use client';

import { useEffect } from 'react';
import AlmanacBackgroundLayer from '@/components/AlmanacBackgroundLayer';
import { readBgOpacity } from '@/lib/almanacBackground';
import { getThemeByDaisyId } from '@/lib/theme-config';
import {
  formatMeasurement,
  convertUnit,
  VOLUME_UNITS,
} from '@/utils/unitConverter';
import {
  fixSpecialCharacters,
  fixSpecialCharactersInArray,
} from '@/lib/fixSpecialCharacters';
import RecipeCopyAttributionNote from '@/components/recipe/RecipeCopyAttributionNote';
import type { RecipeCopySource } from '@/lib/recipeCopyAttribution';
import { toPositiveInt } from '@/utils/recipeTime';
import type { UnitOverrides } from '@/lib/printParams';

interface PrintIngredient {
  id: string;
  name: string;
  amount_grams: number;
  unit: string;
  display_amount: number;
  order_index: number;
}

interface PrintRecipe {
  title: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  tags: string[] | null;
  method_steps: string[] | null;
  notes: string[] | null;
  servings?: number | null;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
}

interface PrintViewProps {
  recipe: PrintRecipe;
  ingredients: PrintIngredient[];
  ownerUsername: string;
  multiplier: number;
  unitOverrides: UnitOverrides;
  autoPrint: boolean;
  copySource?: RecipeCopySource | null;
}

interface Brand {
  primary: string;
  background: string;
  text: string;
  imageColor: string;
  bgOpacity: number;
}

/** Kitchen icons read faint in print — boost like the PDF export does. */
const PRINT_BG_OPACITY_MULTIPLIER = 2;
const PRINT_BG_OPACITY_MAX = 0.4;

function printBackgroundOpacity(siteOpacity: number): number {
  return Math.min(siteOpacity * PRINT_BG_OPACITY_MULTIPLIER, PRINT_BG_OPACITY_MAX);
}

/**
 * Sample the active theme colours from the document so the printed page matches
 * the user's current theme (mirrors `readBrand` in the prepare-almanac page).
 */
function readBrand(): Brand {
  const fallback: Brand = {
    primary: '#CC5500',
    background: '#F7F7F7',
    text: '#1A1A1A',
    imageColor: '#CC5500',
    bgOpacity: 0.15,
  };
  if (typeof window === 'undefined') return fallback;

  const root = document.documentElement;
  const themeId = root.getAttribute('data-theme') || 'tangerine-light';
  const theme = getThemeByDaisyId(themeId);
  const styles = getComputedStyle(root);
  const imageColor =
    styles.getPropertyValue('--theme-image-color').trim() ||
    theme?.colors['primary'] ||
    fallback.imageColor;

  return {
    primary: theme?.colors['primary'] || imageColor,
    background: theme?.colors['base-100'] || fallback.background,
    text: theme?.colors['base-content'] || fallback.text,
    imageColor,
    bgOpacity: readBgOpacity(),
  };
}

const isOtherUnit = (unit: string) => unit.trim().toLowerCase() === 'other';
const isHiddenUnit = (unit: string) => {
  const normalized = unit.trim().toLowerCase();
  return normalized === 'other' || normalized.length === 0;
};

/**
 * Resolve the scaled amount + unit for an ingredient using the chosen unit
 * override and the active multiplier. Mirrors `getDisplayAmount` from
 * `RecipePageClient` so printed values match the on-screen recipe exactly.
 */
function getDisplayAmount(
  ingredient: PrintIngredient,
  selectedUnit: string,
  multiplier: number
): { amount: number; unit: string } {
  if (isOtherUnit(ingredient.unit) || isOtherUnit(selectedUnit)) {
    return { amount: ingredient.amount_grams * multiplier, unit: 'other' };
  }

  const originalIsVolume = VOLUME_UNITS[ingredient.unit.toLowerCase()] !== undefined;
  const currentIsVolume = VOLUME_UNITS[selectedUnit.toLowerCase()] !== undefined;
  const lower = selectedUnit.toLowerCase();

  let amount: number;

  if (originalIsVolume && currentIsVolume) {
    amount = convertUnit(ingredient.display_amount, ingredient.unit, selectedUnit, ingredient.name);
  } else if (originalIsVolume && !currentIsVolume) {
    const grams = convertUnit(ingredient.display_amount, ingredient.unit, 'g', ingredient.name);
    if (lower === 'kg' || lower === 'kilogram' || lower === 'kilograms') {
      amount = grams / 1000;
    } else if (lower === 'oz' || lower === 'ounce' || lower === 'ounces') {
      amount = grams / 28.35;
    } else if (lower === 'lb' || lower === 'pound' || lower === 'pounds') {
      amount = grams / 453.592;
    } else {
      amount = grams;
    }
  } else if (!originalIsVolume && currentIsVolume) {
    amount = convertUnit(ingredient.amount_grams, 'g', selectedUnit, ingredient.name);
  } else {
    if (lower === 'kg' || lower === 'kilogram' || lower === 'kilograms') {
      amount = ingredient.amount_grams / 1000;
    } else if (lower === 'oz' || lower === 'ounce' || lower === 'ounces') {
      amount = ingredient.amount_grams / 28.35;
    } else if (lower === 'lb' || lower === 'pound' || lower === 'pounds') {
      amount = ingredient.amount_grams / 453.592;
    } else {
      amount = ingredient.amount_grams;
    }
  }

  return { amount: amount * multiplier, unit: selectedUnit };
}

function formatAmountOnly(amount: number): string {
  return `${Math.round(amount * 100) / 100}`;
}

export default function PrintView({
  recipe,
  ingredients,
  ownerUsername,
  multiplier,
  unitOverrides,
  autoPrint,
  copySource = null,
}: PrintViewProps) {
  // Trigger the print dialog automatically when opened with `?auto=1`.
  useEffect(() => {
    if (!autoPrint) return;
    // Wait for layout/fonts to settle so the preview reflects the final layout.
    const id = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(id);
  }, [autoPrint]);

  const brand = readBrand();
  const bgOpacity = printBackgroundOpacity(brand.bgOpacity);

  const title = fixSpecialCharacters(recipe.title);
  const description = recipe.description ? fixSpecialCharacters(recipe.description) : null;
  const methodSteps = fixSpecialCharactersInArray(recipe.method_steps || []);
  const notes = fixSpecialCharactersInArray(recipe.notes || []);
  const tags = recipe.tags || [];

  const baseServings = toPositiveInt(recipe.servings);
  const prepMinutes = toPositiveInt(recipe.prep_time_minutes);
  const cookMinutes = toPositiveInt(recipe.cook_time_minutes);
  const metaParts: string[] = [];
  if (baseServings != null) {
    metaParts.push(`${baseServings} ${baseServings === 1 ? 'Serving' : 'Servings'}`);
  }
  if (prepMinutes != null) metaParts.push(`Prep ${prepMinutes} min`);
  if (cookMinutes != null) metaParts.push(`Cook ${cookMinutes} min`);

  return (
    <div className="print-page relative mx-auto w-full max-w-[820px] px-6 py-8 sm:px-10 sm:py-10">
      <div
        className="relative overflow-hidden rounded-lg"
        style={{
          backgroundColor: brand.background,
          color: brand.text,
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        <AlmanacBackgroundLayer imageColor={brand.imageColor} bgOpacity={bgOpacity} />
        <div
          className="h-1.5 w-full relative z-10"
          style={{ backgroundColor: brand.primary }}
          aria-hidden
        />

        <div className="relative z-10 px-7 py-8 sm:px-10 sm:py-10">
          {/* Title + author */}
          <h1
            className="special-elite-regular break-words text-3xl sm:text-4xl font-bold leading-tight"
            style={{ color: brand.primary }}
          >
            {title}
          </h1>
          <p className="arial-font mt-1 text-sm sm:text-base" style={{ color: brand.text }}>
            by {ownerUsername}
          </p>

          {metaParts.length > 0 && (
            <p className="arial-font mt-1 text-sm opacity-80" style={{ color: brand.text }}>
              {metaParts.join('  ·  ')}
            </p>
          )}

          {tags.length > 0 && (
            <p className="arial-font mt-2 text-sm opacity-70" style={{ color: brand.text }}>
              {tags.map((t) => `#${t}`).join('   ')}
            </p>
          )}

          {/* Image */}
          {recipe.image_url && (
            <div className="mt-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={recipe.image_url}
                alt={title}
                className="w-full rounded-lg object-cover"
                style={{ maxHeight: '12cm' }}
              />
            </div>
          )}

          {/* Description */}
          {description && (
            <p className="arial-font mt-5 break-words text-base leading-relaxed" style={{ color: brand.text }}>
              {description}
            </p>
          )}

          {/* Ingredients */}
          {ingredients.length > 0 && (
            <section className="mt-7" style={{ breakInside: 'avoid' }}>
              <PrintHeading label="Ingredients" color={brand.primary} />
              <ul className="arial-font mt-2 space-y-1 text-base">
                {ingredients.map((ingredient) => {
                  const name = fixSpecialCharacters(ingredient.name);
                  const selectedUnit = unitOverrides[ingredient.id] || ingredient.unit;
                  const { amount, unit } = getDisplayAmount(ingredient, selectedUnit, multiplier);
                  const displayText = isHiddenUnit(unit)
                    ? formatAmountOnly(amount)
                    : formatMeasurement(amount, unit);
                  return (
                    <li key={ingredient.id} className="break-words">
                      <span style={{ color: brand.primary }}>•</span> {displayText} {name}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Method */}
          {methodSteps.length > 0 && (
            <section className="mt-7">
              <PrintHeading label="Method" color={brand.primary} />
              <ol className="arial-font mt-2 space-y-2 text-base">
                {methodSteps.map((step, index) => (
                  <li key={index} className="break-words" style={{ breakInside: 'avoid' }}>
                    <span className="font-bold mr-1" style={{ color: brand.primary }}>
                      {index + 1}.
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Notes */}
          {(notes.length > 0 || copySource) && (
            <section className="mt-7">
              <PrintHeading label="Notes" color={brand.primary} />
              <ul className="arial-font mt-2 space-y-1 text-sm opacity-90">
                {notes.map((note, index) => (
                  <li key={index} className="break-words" style={{ breakInside: 'avoid' }}>
                    <span style={{ color: brand.primary }}>•</span> {note}
                  </li>
                ))}
                {copySource && (
                  <li className="break-words" style={{ breakInside: 'avoid' }}>
                    <span style={{ color: brand.primary }}>•</span>{' '}
                    <RecipeCopyAttributionNote source={copySource} variant="print" />
                  </li>
                )}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function PrintHeading({ label, color }: { label: string; color: string }) {
  return (
    <div>
      <h2 className="special-elite-regular text-xl sm:text-2xl font-bold leading-tight" style={{ color }}>
        {label}
      </h2>
      <div className="mt-1 h-px w-12" style={{ backgroundColor: color }} aria-hidden />
    </div>
  );
}
