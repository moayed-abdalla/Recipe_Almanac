/**
 * Prepare Almanac Page
 *
 * Lets the user pick which recipes go into their downloadable PDF cookbook,
 * shows a live theme-matched preview of the resulting almanac, and triggers a
 * branded PDF download via the `lib/almanacPdf.ts` helper.
 *
 * Layout:
 *  - lg+ : two-column grid — selection list on the left, preview on the right
 *  - <lg : single column — list on top, preview below
 *
 * Theme colours are sampled from the document at render time so the preview
 * (and PDF) always match the user's current colour theme.
 */

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient } from '@/lib/supabase-client';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorAlert from '@/components/ui/ErrorAlert';
import EmptyState from '@/components/ui/EmptyState';
import AlmanacBackgroundLayer from '@/components/AlmanacBackgroundLayer';
import {
  generateAlmanacPdf,
  type AlmanacRecipe,
  type AlmanacBrand,
} from '@/lib/almanacPdf';
import { readBgOpacity } from '@/lib/almanacBackground';
import { useProfileContext } from '@/contexts/ProfileContext';
import { getThemeByDaisyId } from '@/lib/theme-config';
import {
  fixSpecialCharacters,
  fixSpecialCharactersInArray,
} from '@/lib/fixSpecialCharacters';
import { formatCopyAttributionText, type RecipeCopySource } from '@/lib/recipeCopyAttribution';

/** Group label shown above each section in the selection list. */
type RecipeGroup = 'public' | 'private' | 'favorites';

interface ListRecipe extends AlmanacRecipe {
  group: RecipeGroup;
  /** Used purely for stable sort within a group. */
  createdAt?: string;
}

type RawIngredient = {
  name: string;
  display_amount: number;
  unit: string;
  order_index: number;
};

type RawRecipeRow = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  tags: string[] | null;
  method_steps: string[] | null;
  notes: string[] | null;
  copied_from_recipe_id?: string | null;
  is_public?: boolean | null;
  created_at?: string | null;
  profiles?: { username: string } | { username: string }[] | null;
  ingredients?: RawIngredient[] | null;
};

const GROUP_LABELS: Record<RecipeGroup, string> = {
  public: 'My Public Recipes',
  private: 'My Private Recipes',
  favorites: 'Favourited Recipes',
};

/**
 * Read the currently-active theme colours from the document.
 * Falls back to the `tangerine-light` theme if anything goes wrong.
 */
function readBrand(): AlmanacBrand {
  if (typeof window === 'undefined') {
    return {
      primary: '#CC5500',
      background: '#F7F7F7',
      text: '#CC5500',
      imageColor: '#CC5500',
      bgOpacity: 0.15,
      mode: 'light',
    };
  }
  const root = document.documentElement;
  const themeId = root.getAttribute('data-theme') || 'tangerine-light';
  const mode = (root.getAttribute('data-theme-mode') as 'light' | 'dark') || 'light';
  const theme = getThemeByDaisyId(themeId);

  // Prefer values straight from the live CSS so any user override is honoured.
  const styles = getComputedStyle(root);
  const imageColor =
    styles.getPropertyValue('--theme-image-color').trim() ||
    theme?.colors['primary'] ||
    '#CC5500';

  return {
    primary: theme?.colors['primary'] || imageColor,
    background: theme?.colors['base-100'] || '#FFFFFF',
    text: theme?.colors['base-content'] || '#1A1A1A',
    imageColor,
    bgOpacity: readBgOpacity(),
    mode,
  };
}

/**
 * Normalize the Supabase row shape into our `ListRecipe` payload.
 */
function normalizeRow(
  row: RawRecipeRow,
  group: RecipeGroup,
  copySources: Map<string, RecipeCopySource>
): ListRecipe {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const ingredients = (row.ingredients || [])
    .slice()
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((ing) => ({
      name: fixSpecialCharacters(ing.name),
      display_amount: ing.display_amount,
      unit: ing.unit,
    }));

  return {
    id: row.id,
    title: fixSpecialCharacters(row.title),
    description: row.description
      ? fixSpecialCharacters(row.description)
      : null,
    image_url: row.image_url,
    tags: row.tags || [],
    method_steps: fixSpecialCharactersInArray(row.method_steps || []),
    notes: fixSpecialCharactersInArray(row.notes || []),
    ingredients,
    author_username: profile?.username ?? null,
    copySource: row.copied_from_recipe_id
      ? copySources.get(row.copied_from_recipe_id) ?? null
      : null,
    group,
    createdAt: row.created_at || undefined,
  };
}

/** All columns required to render a recipe in the preview + PDF. */
const FULL_RECIPE_SELECT = `
  id,
  title,
  description,
  image_url,
  tags,
  method_steps,
  notes,
  copied_from_recipe_id,
  is_public,
  created_at,
  profiles:user_id ( username ),
  ingredients ( name, display_amount, unit, order_index )
`;

async function fetchCopySources(
  rows: RawRecipeRow[]
): Promise<Map<string, RecipeCopySource>> {
  const ids = [
    ...new Set(
      rows
        .map((row) => row.copied_from_recipe_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  if (ids.length === 0) return new Map();

  const { data, error } = await supabaseClient
    .from('recipes')
    .select('id, slug, title')
    .in('id', ids);

  if (error) {
    console.warn('Failed to load copy attribution sources:', error.message);
    return new Map();
  }

  const map = new Map<string, RecipeCopySource>();
  for (const row of data || []) {
    map.set(row.id, { slug: row.slug, title: row.title });
  }
  return map;
}

/**
 * Fetch every recipe the user might want to put in their almanac:
 *  - Their own public recipes
 *  - Their own private recipes
 *  - Recipes they've favourited (deduped against their own)
 */
async function fetchAlmanacRecipes(userId: string): Promise<ListRecipe[]> {
  // Own recipes (public + private) in one query
  const ownPromise = supabaseClient
    .from('recipes')
    .select(FULL_RECIPE_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Favourites — look up recipe_ids, then load the full rows.
  const favIdsPromise = supabaseClient
    .from('saved_recipes')
    .select('recipe_id')
    .eq('user_id', userId);

  const [ownRes, favIdsRes] = await Promise.all([ownPromise, favIdsPromise]);

  if (ownRes.error) {
    throw new Error(ownRes.error.message || 'Failed to load your recipes.');
  }

  const ownRows = (ownRes.data || []) as RawRecipeRow[];
  const ownIds = new Set(ownRows.map((r) => r.id));
  let favRows: RawRecipeRow[] = [];

  let favList: ListRecipe[] = [];
  if (!favIdsRes.error && favIdsRes.data && favIdsRes.data.length > 0) {
    const favIds = (favIdsRes.data as { recipe_id: string }[])
      .map((row) => row.recipe_id)
      .filter((id) => !ownIds.has(id));

    if (favIds.length > 0) {
      const favRes = await supabaseClient
        .from('recipes')
        .select(FULL_RECIPE_SELECT)
        .in('id', favIds)
        .order('created_at', { ascending: false });
      if (favRes.error) {
        console.warn('Failed to load favourite recipes:', favRes.error.message);
      } else {
        favRows = (favRes.data as RawRecipeRow[] | null) || [];
      }
    }
  }

  const allRows = [...ownRows, ...favRows];
  const copySources = await fetchCopySources(allRows);

  const ownList: ListRecipe[] = ownRows.map((row) =>
    normalizeRow(row, row.is_public ? 'public' : 'private', copySources)
  );

  favList = favRows.map((row) => normalizeRow(row, 'favorites', copySources));

  return [...ownList, ...favList];
}

export default function PrepareAlmanacPage() {
  const { user, loading: authLoading, error: authError } = useAuth({ requireAuth: true });
  const { profile } = useProfileContext();

  const [recipes, setRecipes] = useState<ListRecipe[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [brand, setBrand] = useState<AlmanacBrand>(() => ({
    primary: '#CC5500',
    background: '#F7F7F7',
    text: '#1A1A1A',
    imageColor: '#CC5500',
    bgOpacity: 0.15,
    mode: 'light',
  }));

  // Keep brand colors in sync with whatever theme the user is on right now.
  useEffect(() => {
    const apply = () => setBrand(readBrand());
    apply();

    const observer = new MutationObserver(() => apply());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-theme-mode'],
    });
    return () => observer.disconnect();
  }, []);

  const loadRecipes = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      setLoading(true);
      const list = await fetchAlmanacRecipes(user.id);
      setRecipes(list);
      // Default to all of the user's own recipes being selected — favourites
      // are opt-in (they may not all belong in a personal cookbook).
      setSelectedIds(new Set(list.filter((r) => r.group !== 'favorites').map((r) => r.id)));
    } catch (err) {
      console.error('Error loading recipes for prepare_almanac:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recipes.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void loadRecipes();
    }
  }, [user, loadRecipes]);

  const grouped = useMemo(() => {
    const out: Record<RecipeGroup, ListRecipe[]> = { public: [], private: [], favorites: [] };
    recipes.forEach((r) => {
      out[r.group].push(r);
    });
    return out;
  }, [recipes]);

  const selectedRecipes = useMemo(
    () => recipes.filter((r) => selectedIds.has(r.id)),
    [recipes, selectedIds]
  );

  const toggleRecipe = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(recipes.map((r) => r.id)));
  const clearAll = () => setSelectedIds(new Set());
  const selectOwnOnly = () =>
    setSelectedIds(new Set(recipes.filter((r) => r.group !== 'favorites').map((r) => r.id)));

  const handleDownload = async () => {
    if (selectedRecipes.length === 0 || downloading) return;
    setDownloading(true);
    try {
      const ordered = selectedRecipes.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        image_url: r.image_url,
        tags: r.tags,
        method_steps: r.method_steps,
        notes: r.notes,
        ingredients: r.ingredients,
        author_username: r.author_username,
        copySource: r.copySource,
      }));
      const ownerName = profile?.username || user?.email?.split('@')[0] || '';
      await generateAlmanacPdf(ordered, brand, {
        ownerName,
        logoUrl: '/logo.png',
      });
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Sorry, we couldn’t generate the PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner message="Loading your recipes..." />;
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-warning">
          <span>Please log in to prepare your almanac.</span>
        </div>
        <div className="text-center mt-4">
          <Link href="/login" className="btn btn-primary">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  if (authError || error) {
    return (
      <ErrorAlert
        message={authError || error || 'An unexpected error occurred'}
        onRetry={loadRecipes}
      />
    );
  }

  const total = recipes.length;
  const selectedCount = selectedIds.size;

  if (total === 0) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold leading-tight">Prepare Your Almanac</h1>
          <Link href="/almanac" className="btn btn-ghost btn-sm">
            ← Back to Almanac
          </Link>
        </div>
        <EmptyState
          message="You don't have any recipes yet. Create or favourite some first!"
          action={{ label: 'Create Your First Recipe', href: '/recipe/create' }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold leading-tight">Prepare Your Almanac</h1>
          <p className="text-sm sm:text-base opacity-70 mt-1 arial-font">
            Pick the recipes you want in your cookbook, preview the result, then download a PDF.
          </p>
        </div>
        <Link href="/almanac" className="btn btn-ghost btn-sm self-start sm:self-auto">
          ← Back to Almanac
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SELECTION LIST */}
        <section className="bg-base-100/70 backdrop-blur-sm border border-base-300 rounded-lg p-3 sm:p-4 flex flex-col min-h-[400px] lg:max-h-[calc(100vh-220px)]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-lg sm:text-xl font-bold special-elite-regular">
              Your Recipes
              <span className="ml-2 text-sm font-normal opacity-70 arial-font">
                ({selectedCount}/{total} selected)
              </span>
            </h2>
            <div className="flex flex-wrap gap-1">
              <button onClick={selectAll} className="btn btn-xs btn-outline" type="button">
                Select all
              </button>
              <button onClick={selectOwnOnly} className="btn btn-xs btn-outline" type="button">
                Mine only
              </button>
              <button onClick={clearAll} className="btn btn-xs btn-ghost" type="button">
                Clear
              </button>
            </div>
          </div>

          <div className="overflow-y-auto pr-1 flex-1 space-y-5">
            {(['public', 'private', 'favorites'] as RecipeGroup[]).map((group) => {
              const list = grouped[group];
              if (list.length === 0) return null;
              return (
                <div key={group}>
                  <h3 className="text-xs uppercase tracking-wider opacity-60 mb-2 arial-font">
                    {GROUP_LABELS[group]} ({list.length})
                  </h3>
                  <ul className="space-y-1.5">
                    {list.map((recipe) => {
                      const checked = selectedIds.has(recipe.id);
                      return (
                        <li key={recipe.id}>
                          <label
                            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors border ${
                              checked
                                ? 'border-primary/60 bg-primary/10'
                                : 'border-transparent hover:bg-base-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRecipe(recipe.id)}
                              className="checkbox checkbox-primary checkbox-sm flex-shrink-0"
                            />
                            <div className="w-10 h-10 rounded bg-base-300 overflow-hidden flex-shrink-0 relative">
                              {recipe.image_url ? (
                                <Image
                                  src={recipe.image_url}
                                  alt={recipe.title}
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] opacity-50">
                                  no img
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm sm:text-base font-medium truncate arial-font">
                                {recipe.title}
                              </div>
                              <div className="text-xs opacity-60 arial-font truncate">
                                {recipe.ingredients.length} ingredient
                                {recipe.ingredients.length === 1 ? '' : 's'}
                                {recipe.author_username && group === 'favorites'
                                  ? ` · by ${recipe.author_username}`
                                  : ''}
                              </div>
                            </div>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* PREVIEW */}
        <section className="flex flex-col min-h-[400px] lg:max-h-[calc(100vh-220px)]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg sm:text-xl font-bold special-elite-regular">
              Almanac Preview
            </h2>
            <span className="text-xs opacity-60 arial-font">
              {selectedCount === 0
                ? 'Select recipes to preview'
                : `${selectedCount} page${selectedCount === 1 ? '' : 's'} + cover`}
            </span>
          </div>

          <div
            className="flex-1 overflow-y-auto rounded-lg border border-base-300 p-3 sm:p-4 space-y-4"
            style={{
              backgroundColor:
                brand.mode === 'dark' ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.04)',
            }}
          >
            {selectedCount === 0 ? (
              <div className="h-full min-h-[300px] flex items-center justify-center opacity-60 text-sm arial-font text-center px-4">
                Tick a recipe on the left to see it appear in your cookbook preview.
              </div>
            ) : (
              <>
                <PreviewCover
                  brand={brand}
                  ownerName={profile?.username || ''}
                  recipeCount={selectedRecipes.length}
                />
                {selectedRecipes.map((recipe) => (
                  <PreviewPage key={recipe.id} recipe={recipe} brand={brand} />
                ))}
              </>
            )}
          </div>
        </section>
      </div>

      {/* DOWNLOAD ACTION */}
      <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 bg-base-100/70 backdrop-blur-sm border border-base-300 rounded-lg p-4">
        <div className="text-sm arial-font opacity-80 text-center sm:text-left">
          {selectedCount === 0
            ? 'Select at least one recipe to enable the download.'
            : `Ready to download ${selectedCount} recipe${selectedCount === 1 ? '' : 's'} as a PDF cookbook.`}
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={selectedCount === 0 || downloading}
          className="btn btn-primary w-full sm:w-auto min-w-[200px]"
        >
          {downloading ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              Generating PDF...
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              Download Almanac
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * Visual preview of the cover page. Mirrors the cover layout produced by
 * `lib/almanacPdf.ts` so the user knows exactly what they're going to get.
 */
function PreviewCover({
  brand,
  ownerName,
  recipeCount,
}: {
  brand: AlmanacBrand;
  ownerName: string;
  recipeCount: number;
}) {
  return (
    <article
      className="rounded-md shadow-md mx-auto w-full max-w-[520px] relative overflow-hidden"
      style={{
        aspectRatio: '210 / 297',
        backgroundColor: brand.background,
        color: brand.text,
      }}
    >
      <AlmanacBackgroundLayer imageColor={brand.imageColor} bgOpacity={brand.bgOpacity} />
      <div className="h-1.5 w-full relative z-10" style={{ backgroundColor: brand.primary }} />
      <div className="absolute bottom-0 left-0 right-0 h-1.5 z-10" style={{ backgroundColor: brand.primary }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 py-10 text-center z-10">
        <div
          className="w-24 h-24 sm:w-32 sm:h-32 mb-4"
          style={{
            backgroundColor: brand.primary,
            WebkitMaskImage: 'url(/logo.png)',
            maskImage: 'url(/logo.png)',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
          }}
        />
        <h3
          className="text-2xl sm:text-3xl font-bold special-elite-regular mb-2"
          style={{ color: brand.primary }}
        >
          Recipe Almanac
        </h3>
        <p className="italic mb-1 arial-font" style={{ color: brand.text }}>
          {ownerName ? `${ownerName}'s Cookbook` : 'Your Personal Cookbook'}
        </p>
        <p className="special-elite-regular text-sm" style={{ color: brand.text }}>
          {recipeCount} {recipeCount === 1 ? 'recipe' : 'recipes'}
        </p>
        <div
          className="mt-3 h-px w-16"
          style={{ backgroundColor: brand.primary }}
          aria-hidden
        />
      </div>
    </article>
  );
}

/**
 * Visual preview of one recipe page. The text & layout mirror the PDF — image
 * up top, ingredients/method below — so the on-screen and downloaded versions
 * look identical apart from natural font rendering differences.
 */
function PreviewPage({ recipe, brand }: { recipe: ListRecipe; brand: AlmanacBrand }) {
  return (
    <article
      className="rounded-md shadow-md mx-auto w-full max-w-[520px] overflow-hidden relative"
      style={{
        backgroundColor: brand.background,
        color: brand.text,
      }}
    >
      <AlmanacBackgroundLayer imageColor={brand.imageColor} bgOpacity={brand.bgOpacity} />
      <div className="h-1.5 w-full relative z-10" style={{ backgroundColor: brand.primary }} />
      <header className="relative z-10 flex items-center gap-2 px-4 pt-3 pb-2">
        <div
          className="w-5 h-5"
          style={{
            backgroundColor: brand.primary,
            WebkitMaskImage: 'url(/logo.png)',
            maskImage: 'url(/logo.png)',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
          }}
        />
        <span
          className="text-xs font-bold special-elite-regular"
          style={{ color: brand.primary }}
        >
          Recipe Almanac
        </span>
      </header>

      <div className="relative z-10 px-4 pb-5">
        <h3
          className="text-xl sm:text-2xl font-bold special-elite-regular mb-1 break-words"
          style={{ color: brand.primary }}
        >
          {recipe.title}
        </h3>
        {recipe.author_username && (
          <p className="text-xs italic mb-2 arial-font opacity-80">
            by {recipe.author_username}
          </p>
        )}

        {recipe.image_url && (
          <div className="my-3 w-full h-32 sm:h-40 relative rounded overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {recipe.tags.length > 0 && (
          <p className="text-[11px] arial-font opacity-70 mb-2">
            {recipe.tags.map((t) => `#${t}`).join('   ')}
          </p>
        )}

        {recipe.description && (
          <p className="text-xs sm:text-sm arial-font mb-3 break-words">
            {recipe.description}
          </p>
        )}

        {recipe.ingredients.length > 0 && (
          <div className="mb-3">
            <PreviewHeading label="Ingredients" brand={brand} />
            <ul className="text-xs sm:text-sm arial-font space-y-0.5">
              {recipe.ingredients.map((ing, idx) => (
                <li key={idx} className="break-words">
                  <span style={{ color: brand.primary }}>•</span>{' '}
                  {formatIngredientPreview(ing.display_amount, ing.unit, ing.name)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {recipe.method_steps.length > 0 && (
          <div className="mb-3">
            <PreviewHeading label="Method" brand={brand} />
            <ol className="text-xs sm:text-sm arial-font space-y-1">
              {recipe.method_steps.map((step, idx) => (
                <li key={idx} className="break-words">
                  <span className="font-bold mr-1" style={{ color: brand.primary }}>
                    {idx + 1}.
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {(recipe.notes.length > 0 || recipe.copySource) && (
          <div className="mb-2">
            <PreviewHeading label="Notes" brand={brand} />
            <ul className="text-xs arial-font italic space-y-0.5 opacity-90">
              {recipe.notes.map((note, idx) => (
                <li key={idx} className="break-words">
                  <span style={{ color: brand.primary }}>•</span> {note}
                </li>
              ))}
              {recipe.copySource && (
                <li className="break-words">
                  <span style={{ color: brand.primary }}>•</span>{' '}
                  {formatCopyAttributionText(recipe.copySource)}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}

function PreviewHeading({ label, brand }: { label: string; brand: AlmanacBrand }) {
  return (
    <div className="mb-1.5">
      <h4
        className="text-sm sm:text-base font-bold special-elite-regular leading-tight"
        style={{ color: brand.primary }}
      >
        {label}
      </h4>
      <div className="mt-0.5 h-px w-10" style={{ backgroundColor: brand.primary }} />
    </div>
  );
}

function formatIngredientPreview(amount: number, unit: string, name: string): string {
  const isOther = !unit || unit.trim().toLowerCase() === 'other';
  const rounded = Number.isFinite(amount)
    ? String(Math.round(amount * 100) / 100)
    : '';
  return isOther ? `${rounded} ${name}`.trim() : `${rounded} ${unit} ${name}`.trim();
}
