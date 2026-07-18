/**
 * Nutrition Panel
 *
 * Optional, collapsible "Nutrition (approximate)" panel for the recipe detail
 * page. It estimates per-recipe and per-serving calories and macros from a
 * static USDA-derived lookup table via `estimateRecipeNutrition`.
 *
 * Every value is explicitly marked as approximate. The panel:
 * - is collapsed by default
 * - shows a 5-cell grid (kcal / protein / carbs / fat / fibre) per recipe
 * - adds a second per-serving grid when the recipe declares a serving count
 * - warns prominently when coverage is low (< 70%)
 * - discloses any ingredients it could not match
 * - shows "Not enough data" when there is nothing useful to estimate
 *
 * This is a Client Component so the panel can expand/collapse on interaction.
 */

'use client';

import { useMemo, useState } from 'react';
import { estimateRecipeNutrition, type Nutrition } from '@/utils/nutritionEstimator';

interface NutritionPanelProps {
  ingredients: Array<{ name: string; amount_grams: number }>;
  servings: number | null;
}

const COVERAGE_WARNING_THRESHOLD = 0.7;

const MACRO_CELLS: Array<{ key: keyof Nutrition; label: string; unit: string }> = [
  { key: 'kcal', label: 'Calories', unit: 'kcal' },
  { key: 'protein_g', label: 'Protein', unit: 'g' },
  { key: 'carbs_g', label: 'Carbs', unit: 'g' },
  { key: 'fat_g', label: 'Fat', unit: 'g' },
  { key: 'fibre_g', label: 'Fibre', unit: 'g' },
];

function MacroGrid({ values, heading }: { values: Nutrition; heading: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{heading}</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
        {MACRO_CELLS.map((cell) => (
          <div
            key={cell.key}
            className="rounded-lg bg-base-100 px-3 py-3 text-center"
          >
            <div className="text-lg sm:text-xl font-bold">
              {values[cell.key]}
              {cell.unit === 'g' ? (
                <span className="text-sm font-normal opacity-70"> g</span>
              ) : null}
            </div>
            <div className="text-xs opacity-70">
              {cell.label}
              {cell.unit === 'kcal' ? ' (kcal)' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NutritionPanel({ ingredients, servings }: NutritionPanelProps) {
  const [open, setOpen] = useState(false);

  const result = useMemo(
    () => estimateRecipeNutrition(ingredients, servings),
    [ingredients, servings]
  );

  // We have something worth showing only when at least one ingredient matched
  // (matched mass > 0, reflected by coverage > 0).
  const hasData = result.coverage > 0;
  const coveragePercent = Math.round(result.coverage * 100);
  const lowCoverage = hasData && result.coverage < COVERAGE_WARNING_THRESHOLD;
  const perServingHeading =
    servings != null && servings > 0
      ? `Per serving (recipe serves ${servings})`
      : 'Per serving';

  return (
    <div className="mb-8">
      <div className="card bg-base-200">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 p-4 text-left"
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-xl sm:text-2xl font-bold special-elite-regular min-w-0">
              <span className="sm:hidden">Nutrition</span>
              <span className="hidden sm:inline">Nutrition (approximate)</span>
            </span>
            <span
              className="text-base-content/50 cursor-help shrink-0"
              title="Estimated from ingredients. Actual values vary."
              aria-label="Estimated from ingredients. Actual values vary."
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>
          </span>
          <svg
            className={`w-5 h-5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {open && (
          <div className="px-4 pb-4 arial-font">
            {!hasData ? (
              <p className="text-sm opacity-70">
                Not enough data to estimate nutrition for this recipe.
              </p>
            ) : (
              <>
                <p className="text-sm opacity-70 mb-3">
                  Approximate values shown per recipe
                  {result.perServing ? ' and per serving' : ''}. Estimated from ingredient
                  amounts using USDA reference data — actual values vary.
                </p>

                <MacroGrid values={result.total} heading="Per recipe" />

                {result.perServing && (
                  <div className="mt-4">
                    <MacroGrid values={result.perServing} heading={perServingHeading} />
                  </div>
                )}

                {lowCoverage && (
                  <div className="mt-4 alert alert-warning">
                    <span className="text-sm">
                      We could only estimate about {coveragePercent}% of the ingredients by
                      weight, so these figures may be well off. See the unmatched list below.
                    </span>
                  </div>
                )}

                {!lowCoverage && (
                  <p className="text-xs opacity-60 mt-3">
                    Based on about {coveragePercent}% of the recipe by weight.
                  </p>
                )}

                {result.unmatched.length > 0 && (
                  <details className="mt-3">
                    <summary className="text-sm cursor-pointer opacity-80">
                      {result.unmatched.length} ingredient
                      {result.unmatched.length === 1 ? '' : 's'} not included in the estimate
                    </summary>
                    <ul className="list-disc list-outside ml-5 mt-2 space-y-1 text-sm opacity-70">
                      {result.unmatched.map((name, index) => (
                        <li key={`${name}-${index}`}>{name}</li>
                      ))}
                    </ul>
                  </details>
                )}

                <p className="text-xs opacity-50 mt-4">
                  Approximate only. Not a substitute for professional dietary advice.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
