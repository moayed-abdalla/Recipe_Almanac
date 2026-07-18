/**
 * Recipe Page Client Component
 * 
 * Displays a full recipe view with:
 * - Recipe image
 * - Title, author, and view count
 * - Star button to favorite/unfavorite
 * - Fork button to create own version
 * - Tags
 * - Description
 * - Ingredients list with per-ingredient unit conversion
 * - Method steps
 * - Optional notes
 * 
 * Features:
 * - Per-ingredient unit conversion (grams, kilos, ounces, volume)
 * - Asterisk warning when switching between volume/weight
 * - Check off ingredients as you use them
 * - Favorite/unfavorite functionality
 * - Fork recipe functionality
 * - Responsive design
 * 
 * This is a Client Component because it needs to:
 * - Handle user interactions (favorites, unit conversion, ingredient checking, forking)
 * - Access authentication state
 * - Manage local UI state
 */

'use client';

import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { formatMeasurement, convertUnit, VOLUME_UNITS, hasKnownIngredientDensity } from '@/utils/unitConverter';
import { toPositiveInt } from '@/utils/recipeTime';
import StepTimers from '@/components/recipe/StepTimers';
import { StepImageLightbox } from '@/components/recipe/StepImageLightbox';
import RecipeTutorial from '@/components/tutorial/RecipeTutorial';

// Below-the-fold, client-only sections are code-split so the main recipe
// content paints and hydrates first.
const RecipeRatings = dynamic(() => import('@/components/recipe/RecipeRatings'), {
  ssr: false,
  loading: () => <div className="skeleton mt-8 h-40 w-full rounded-lg" />,
});
const NutritionPanel = dynamic(() => import('@/components/recipe/NutritionPanel'), {
  ssr: false,
  loading: () => <div className="skeleton mb-8 h-32 w-full rounded-lg" />,
});
import { RecipeTimerContext } from '@/components/recipe/timerContext';
import {
  fixSpecialCharacters,
  fixSpecialCharactersInArray,
} from '@/lib/fixSpecialCharacters';
import { encodeUnitOverrides } from '@/lib/printParams';
import { validateRecipePayload } from '@/lib/validation';
import RecipeCopyAttributionNote from '@/components/recipe/RecipeCopyAttributionNote';
import type { RecipeCopySource } from '@/lib/recipeCopyAttribution';

interface Ingredient {
  id: string;
  name: string;
  amount_grams: number;
  unit: string;
  display_amount: number;
  order_index: number;
}

interface Recipe {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  tags: string[];
  method_steps: string[];
  method_step_image_urls?: (string | null)[];
  notes: string[];
  view_count: number;
  is_public?: boolean;
  servings?: number | null;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  nutrition_visible?: boolean | null;
  copied_from_recipe_id?: string | null;
}

interface Owner {
  username: string;
  avatar_url: string | null;
}

interface RecipePageClientProps {
  recipe: Recipe;
  ingredients: Ingredient[];
  owner: Owner;
  isOwner: boolean;
  /** Signed-in viewer's id, resolved on the server. null = signed out. */
  viewerId: string | null;
  /** Whether the viewer has already favorited this recipe (server-resolved). */
  initialIsFavorited: boolean;
  /** Rating summary resolved on the server so the average shows immediately. */
  initialRatingStats: { averageRating: number; ratingCount: number } | null;
  nutritionEnabled: boolean;
  /** null = signed out (show all temperature conversions). */
  preferredTemperatureUnit: 'C' | 'F' | null;
  copySource?: RecipeCopySource | null;
}

// Available unit options for conversion
const UNIT_OPTIONS = {
  weight: ['g', 'kg', 'oz', 'lb'],
  volume: ['cups', 'tbsp', 'tsp', 'ml', 'fl oz'],
};

export default function RecipePageClient({
  recipe,
  ingredients,
  owner,
  isOwner,
  viewerId,
  initialIsFavorited,
  initialRatingStats,
  nutritionEnabled,
  preferredTemperatureUnit,
  copySource = null,
}: RecipePageClientProps) {
  const router = useRouter();

  const displayRecipe = useMemo(
    () => ({
      ...recipe,
      title: fixSpecialCharacters(recipe.title),
      description: recipe.description
        ? fixSpecialCharacters(recipe.description)
        : null,
      method_steps: fixSpecialCharactersInArray(recipe.method_steps),
      notes: fixSpecialCharactersInArray(recipe.notes),
    }),
    [recipe]
  );

  const displayIngredients = useMemo(
    () =>
      ingredients.map((ingredient) => ({
        ...ingredient,
        name: fixSpecialCharacters(ingredient.name),
      })),
    [ingredients]
  );

  // Debug logging (remove in production)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[RecipePageClient] Props received:', {
        isOwner,
        recipeId: recipe.id,
        recipeSlug: recipe.slug,
        ownerUsername: owner.username,
      });
    }
  }, [isOwner, recipe.id, recipe.slug, owner.username]);

  // Wake Lock support detection
  useEffect(() => {
    setWakeLockSupported(typeof navigator !== 'undefined' && 'wakeLock' in navigator);
  }, []);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  // Favorite status and viewer identity are resolved on the server and passed in
  // as props, so the page no longer makes a client-side auth + favorites round
  // trip on mount.
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const user = useMemo(() => (viewerId ? { id: viewerId } : null), [viewerId]);
  const [forking, setForking] = useState(false);
  const forkConfirmRef = useRef<HTMLDialogElement>(null);
  const [stepLightboxUrl, setStepLightboxUrl] = useState<string | null>(null);
  const [viewCount, setViewCount] = useState<number>(recipe.view_count);
  const [viewTracked, setViewTracked] = useState<boolean>(false);
  const viewTrackingRef = useRef<boolean>(false); // Ref to prevent multiple API calls
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [wakeLockSupported, setWakeLockSupported] = useState<boolean>(false);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);

  // Tracks whether the user explicitly enabled the Wake Lock via the toggle.
  // When true, automatic timer-driven release is suppressed.
  const manualWakeLockRef = useRef<boolean>(false);
  // IDs of timers currently counting down, used to coordinate the Wake Lock
  // across every inline step timer on the page.
  const runningTimersRef = useRef<Set<string>>(new Set());

  // Chime mute preference, persisted in localStorage.
  const [timerMuted, setTimerMuted] = useState<boolean>(false);
  useEffect(() => {
    try {
      setTimerMuted(localStorage.getItem('recipe-timer-muted') === 'true');
    } catch {
      // Ignore storage access errors (e.g. privacy mode).
    }
  }, []);
  const toggleTimerMute = useCallback(() => {
    setTimerMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('recipe-timer-muted', String(next));
      } catch {
        // Ignore storage access errors.
      }
      return next;
    });
  }, []);

  // Sync server-resolved state when navigating between recipes (the component
  // stays mounted across param changes, so props update without a remount).
  useEffect(() => {
    setViewCount(recipe.view_count);
    setViewTracked(false);
    viewTrackingRef.current = false; // Reset ref when recipe changes
    setIsFavorited(initialIsFavorited);
  }, [recipe.id, recipe.view_count, initialIsFavorited]);

  const requestWakeLock = useCallback(async () => {
    if (!wakeLockSupported || wakeLockRef.current) return;

    try {
      const sentinel = await navigator.wakeLock.request('screen');
      wakeLockRef.current = sentinel;
      setWakeLockActive(true);

      sentinel.addEventListener('release', () => {
        wakeLockRef.current = null;
        setWakeLockActive(false);
      });
    } catch (error) {
      console.error('Wake Lock request failed:', error);
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  }, [wakeLockSupported]);

  const releaseWakeLock = useCallback(async () => {
    if (!wakeLockRef.current) return;

    try {
      await wakeLockRef.current.release();
    } catch (error) {
      console.error('Wake Lock release failed:', error);
    } finally {
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  }, []);

  const toggleWakeLock = useCallback(async () => {
    if (wakeLockActive) {
      // Manual disable: also clear the manual flag so timers regain control.
      manualWakeLockRef.current = false;
      await releaseWakeLock();
    } else {
      // Manual enable: keep the lock held until the user turns it off, even
      // after all timers finish.
      manualWakeLockRef.current = true;
      await requestWakeLock();
    }
  }, [wakeLockActive, requestWakeLock, releaseWakeLock]);

  // Called by each inline step timer when it starts or stops counting down.
  // The Wake Lock is requested as soon as any timer runs, and released once no
  // timers are running unless the user enabled the lock manually.
  const setTimerRunning = useCallback(
    (id: string, running: boolean) => {
      const timers = runningTimersRef.current;
      if (running) {
        timers.add(id);
      } else {
        timers.delete(id);
      }

      if (timers.size > 0) {
        if (!wakeLockRef.current) {
          requestWakeLock();
        }
      } else if (!manualWakeLockRef.current && wakeLockRef.current) {
        releaseWakeLock();
      }
    },
    [requestWakeLock, releaseWakeLock]
  );

  const timerContextValue = useMemo(
    () => ({ muted: timerMuted, toggleMute: toggleTimerMute, setTimerRunning }),
    [timerMuted, toggleTimerMute, setTimerRunning]
  );

  // Re-acquire the wake lock when returning to the tab
  useEffect(() => {
    if (!wakeLockSupported) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && wakeLockActive && !wakeLockRef.current) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [wakeLockActive, wakeLockSupported, requestWakeLock]);

  // Release wake lock on unmount
  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch((error) => {
          console.error('Wake Lock release failed during cleanup:', error);
        });
        wakeLockRef.current = null;
      }
    };
  }, []);

  // In the installed/offline PWA, keep the screen awake by default so a recipe
  // stays readable while cooking. The website keeps it off by default.
  const autoWakeRequestedRef = useRef(false);
  useEffect(() => {
    if (!wakeLockSupported || autoWakeRequestedRef.current) return;

    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (!isStandalone) return;

    autoWakeRequestedRef.current = true;
    requestWakeLock();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time default-on for installed PWA
  }, [wakeLockSupported]);
  
  // Ingredient multiplier state (default 1x)
  const [multiplier, setMultiplier] = useState<number>(1);
  const [customMultiplier, setCustomMultiplier] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  // Optional servings / timing metadata (only rendered when present)
  const baseServings = toPositiveInt(recipe.servings);
  const prepMinutes = toPositiveInt(recipe.prep_time_minutes);
  const cookMinutes = toPositiveInt(recipe.cook_time_minutes);
  const hasMetaStrip = baseServings != null || prepMinutes != null || cookMinutes != null;

  // Per-ingredient unit conversion state
  // Key: ingredient ID, Value: selected unit
  const [ingredientUnits, setIngredientUnits] = useState<Record<string, string>>({});
  
  // Track if ingredient has been converted from original unit type
  // Key: ingredient ID, Value: { originalIsVolume: boolean, currentIsVolume: boolean }
  const [unitWarnings, setUnitWarnings] = useState<Record<string, { originalIsVolume: boolean; currentIsVolume: boolean }>>({});

  // Most recently selected unit when user converts an ingredient (session-only)
  const [lastChangedUnit, setLastChangedUnit] = useState<string | null>(null);

  const hasUnitOverrides = useMemo(
    () =>
      displayIngredients.some(
        (ing) => (ingredientUnits[ing.id] ?? ing.unit) !== ing.unit
      ),
    [displayIngredients, ingredientUnits]
  );

  /**
   * Initialize ingredient units and warnings
   */
  useEffect(() => {
    const initialUnits: Record<string, string> = {};
    const initialWarnings: Record<string, { originalIsVolume: boolean; currentIsVolume: boolean }> = {};
    
    ingredients.forEach((ing) => {
      // Set initial unit to the ingredient's original unit
      initialUnits[ing.id] = ing.unit;
      
      // Determine if original unit is volume or weight
      const originalIsVolume = VOLUME_UNITS[ing.unit.toLowerCase()] !== undefined;
      initialWarnings[ing.id] = {
        originalIsVolume,
        currentIsVolume: originalIsVolume,
      };
    });
    
    setIngredientUnits(initialUnits);
    setUnitWarnings(initialWarnings);
    setLastChangedUnit(null);
  }, [ingredients]);

  /**
   * Track scroll percentage and register view when user scrolls more than 5%
   */
  useEffect(() => {
    if (viewTracked || viewTrackingRef.current) return; // Already tracked view for this page load

    const handleScroll = () => {
      // Prevent multiple API calls
      if (viewTrackingRef.current) return;

      // Calculate scroll percentage
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Calculate scrollable distance
      const scrollableDistance = documentHeight - windowHeight;
      
      // If page is shorter than viewport or no scrollable distance, consider it viewed
      if (scrollableDistance <= 0) {
        // Page fits in viewport, consider it viewed immediately
        viewTrackingRef.current = true;
        setViewTracked(true);
        
        // Call API to increment view count
        fetch(`/api/recipes/${recipe.slug}/view`, {
          method: 'POST',
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success && data.view_count !== undefined) {
              setViewCount(data.view_count);
            }
          })
          .catch((error) => {
            console.error('Error tracking view:', error);
          });
        
        // Remove scroll listener after tracking
        window.removeEventListener('scroll', handleScroll);
        return;
      }
      
      // Calculate how much of the page has been scrolled
      const scrollPercentage = (scrollTop / scrollableDistance) * 100;
      
      // If user has scrolled more than 5%, register the view
      if (scrollPercentage > 5) {
        viewTrackingRef.current = true;
        setViewTracked(true);
        
        // Call API to increment view count
        fetch(`/api/recipes/${recipe.slug}/view`, {
          method: 'POST',
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success && data.view_count !== undefined) {
              setViewCount(data.view_count);
            }
          })
          .catch((error) => {
            console.error('Error tracking view:', error);
          });
        
        // Remove scroll listener after tracking
        window.removeEventListener('scroll', handleScroll);
      }
    };

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Check initial scroll position (in case user refreshes mid-scroll)
    handleScroll();

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [recipe.slug, viewTracked]);

  const toggleIngredient = (id: string) => {
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedIngredients(newChecked);
  };

  /**
   * Change unit for a specific ingredient
   */
  const changeIngredientUnit = (ingredientId: string, newUnit: string) => {
    const ingredient = ingredients.find(ing => ing.id === ingredientId);
    if (!ingredient) return;

    const originalIsVolume = VOLUME_UNITS[ingredient.unit.toLowerCase()] !== undefined;
    const newIsVolume = VOLUME_UNITS[newUnit.toLowerCase()] !== undefined;
    const nextUnits = { ...ingredientUnits, [ingredientId]: newUnit };

    setIngredientUnits(nextUnits);

    setUnitWarnings(prev => ({
      ...prev,
      [ingredientId]: {
        originalIsVolume,
        currentIsVolume: newIsVolume,
      },
    }));

    if (newUnit !== ingredient.unit) {
      setLastChangedUnit(newUnit);
    } else {
      const stillHasOverrides = ingredients.some(
        (ing) => (nextUnits[ing.id] ?? ing.unit) !== ing.unit
      );
      if (!stillHasOverrides) {
        setLastChangedUnit(null);
      }
    }
  };

  /**
   * Handle multiplier button clicks
   */
  const handleMultiplierClick = (value: number) => {
    setMultiplier(value);
    setShowCustomInput(false);
    setCustomMultiplier('');
  };

  /**
   * Handle custom multiplier input
   */
  const handleCustomMultiplierChange = (value: string) => {
    setCustomMultiplier(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setMultiplier(numValue);
    }
  };

  /**
   * Handle custom multiplier input toggle
   */
  const handleCustomInputToggle = () => {
    setShowCustomInput(!showCustomInput);
    if (!showCustomInput) {
      setCustomMultiplier('');
    } else {
      // Reset to 1x when closing custom input
      setMultiplier(1);
      setCustomMultiplier('');
    }
  };

  /**
   * Get display amount for an ingredient based on selected unit and multiplier
   * "Other" units are not converted - amount is multiplied only
   */
  const getDisplayAmount = (ingredient: Ingredient): { amount: number; unit: string; showWarning: boolean } => {
    const selectedUnit = ingredientUnits[ingredient.id] || ingredient.unit;
    const isOtherUnit = (u: string) => u.trim().toLowerCase() === 'other';
    
    // "Other" units: no conversion, just apply multiplier to stored amount
    if (isOtherUnit(ingredient.unit) || isOtherUnit(selectedUnit)) {
      const amount = ingredient.amount_grams * multiplier;
      return { amount, unit: 'other', showWarning: false };
    }
    
    const originalIsVolume = VOLUME_UNITS[ingredient.unit.toLowerCase()] !== undefined;
    const currentIsVolume = VOLUME_UNITS[selectedUnit.toLowerCase()] !== undefined;
    const showWarning = originalIsVolume !== currentIsVolume;

    let amount: number;
    let unit: string = selectedUnit;

    if (originalIsVolume && currentIsVolume) {
      // Both volume - direct conversion
      amount = convertUnit(ingredient.display_amount, ingredient.unit, selectedUnit, ingredient.name);
    } else if (originalIsVolume && !currentIsVolume) {
      // Volume to weight
      if (selectedUnit.toLowerCase() === 'g' || selectedUnit.toLowerCase() === 'gram' || selectedUnit.toLowerCase() === 'grams') {
        amount = convertUnit(ingredient.display_amount, ingredient.unit, 'g', ingredient.name);
      } else if (selectedUnit.toLowerCase() === 'kg' || selectedUnit.toLowerCase() === 'kilogram' || selectedUnit.toLowerCase() === 'kilograms') {
        const grams = convertUnit(ingredient.display_amount, ingredient.unit, 'g', ingredient.name);
        amount = grams / 1000;
      } else if (selectedUnit.toLowerCase() === 'oz' || selectedUnit.toLowerCase() === 'ounce' || selectedUnit.toLowerCase() === 'ounces') {
        const grams = convertUnit(ingredient.display_amount, ingredient.unit, 'g', ingredient.name);
        amount = grams / 28.35; // 1 oz = 28.35g
      } else if (selectedUnit.toLowerCase() === 'lb' || selectedUnit.toLowerCase() === 'pound' || selectedUnit.toLowerCase() === 'pounds') {
        const grams = convertUnit(ingredient.display_amount, ingredient.unit, 'g', ingredient.name);
        amount = grams / 453.592; // 1 lb = 453.592g
      } else {
        amount = convertUnit(ingredient.display_amount, ingredient.unit, selectedUnit, ingredient.name);
      }
    } else if (!originalIsVolume && currentIsVolume) {
      // Weight to volume
      amount = convertUnit(ingredient.amount_grams, 'g', selectedUnit, ingredient.name);
    } else {
      // Both weight - direct conversion
      if (selectedUnit.toLowerCase() === 'kg' || selectedUnit.toLowerCase() === 'kilogram' || selectedUnit.toLowerCase() === 'kilograms') {
        amount = ingredient.amount_grams / 1000;
      } else if (selectedUnit.toLowerCase() === 'oz' || selectedUnit.toLowerCase() === 'ounce' || selectedUnit.toLowerCase() === 'ounces') {
        amount = ingredient.amount_grams / 28.35;
      } else if (selectedUnit.toLowerCase() === 'lb' || selectedUnit.toLowerCase() === 'pound' || selectedUnit.toLowerCase() === 'pounds') {
        amount = ingredient.amount_grams / 453.592;
      } else {
        amount = ingredient.amount_grams; // grams
      }
    }

    // Apply multiplier to the amount
    amount = amount * multiplier;

    return { amount, unit, showWarning };
  };

  const isHiddenUnit = (unit: string): boolean => {
    const normalized = unit.trim().toLowerCase();
    return normalized === 'other' || normalized.length === 0;
  };

  const formatAmountOnly = (amount: number): string => {
    const rounded = Math.round(amount * 100) / 100;
    return `${rounded}`;
  };

  /**
   * Get available units for an ingredient based on its original unit type
   */
  const getAvailableUnits = (ingredient: Ingredient): string[] => {
    // "Other" units cannot be converted - unit selector is hidden for these
    if (ingredient.unit.trim().toLowerCase() === 'other') {
      return ['other'];
    }
    const originalIsVolume = VOLUME_UNITS[ingredient.unit.toLowerCase()] !== undefined;
    const hasDensity = hasKnownIngredientDensity(ingredient.name);
    
    if (originalIsVolume && hasDensity) {
      // Can convert to both volume and weight
      return [...UNIT_OPTIONS.volume, ...UNIT_OPTIONS.weight];
    } else if (originalIsVolume) {
      // Only volume conversions
      return UNIT_OPTIONS.volume;
    } else {
      // Weight - can convert to volume if density exists
      if (hasDensity) {
        return [...UNIT_OPTIONS.weight, ...UNIT_OPTIONS.volume];
      }
      return UNIT_OPTIONS.weight;
    }
  };

  const applyUnitToAll = () => {
    if (!lastChangedUnit) return;

    const nextUnits: Record<string, string> = { ...ingredientUnits };
    const nextWarnings: Record<string, { originalIsVolume: boolean; currentIsVolume: boolean }> = {
      ...unitWarnings,
    };

    displayIngredients.forEach((ingredient) => {
      const available = getAvailableUnits(ingredient);
      if (!available.includes(lastChangedUnit)) return;

      nextUnits[ingredient.id] = lastChangedUnit;
      const originalIsVolume = VOLUME_UNITS[ingredient.unit.toLowerCase()] !== undefined;
      const newIsVolume = VOLUME_UNITS[lastChangedUnit.toLowerCase()] !== undefined;
      nextWarnings[ingredient.id] = { originalIsVolume, currentIsVolume: newIsVolume };
    });

    setIngredientUnits(nextUnits);
    setUnitWarnings(nextWarnings);
  };

  /**
   * Toggle favorite status for the current recipe
   */
  const toggleFavorite = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      if (isFavorited) {
        const { error } = await supabaseClient
          .from('saved_recipes')
          .delete()
          .eq('user_id', user.id)
          .eq('recipe_id', recipe.id);

        if (error) {
          console.error('Error removing favorite:', error);
          alert('Failed to remove from favorites. Please try again.');
        } else {
          setIsFavorited(false);
        }
      } else {
        const { error } = await supabaseClient
          .from('saved_recipes')
          .insert({
            user_id: user.id,
            recipe_id: recipe.id,
          });

        if (error) {
          console.error('Error adding favorite:', error);
          alert('Failed to add to favorites. Please try again.');
        } else {
          setIsFavorited(true);
        }
      }
    } catch (err) {
      console.error('Unexpected error toggling favorite:', err);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  /**
   * Open the print-optimised view in a new tab, carrying the current scale
   * multiplier and per-ingredient unit choices across via the URL. The print
   * view auto-triggers `window.print()` once loaded (via `?auto=1`).
   */
  const handlePrint = () => {
    const params = new URLSearchParams();
    if (multiplier && multiplier !== 1) {
      params.set('m', String(multiplier));
    }

    // Only forward units that differ from the ingredient's stored default.
    const overrides: Record<string, string> = {};
    ingredients.forEach((ing) => {
      const chosen = ingredientUnits[ing.id];
      if (chosen && chosen !== ing.unit) {
        overrides[ing.id] = chosen;
      }
    });
    if (Object.keys(overrides).length > 0) {
      params.set('u', encodeUnitOverrides(overrides));
    }

    params.set('auto', '1');
    window.open(
      `/recipe/${recipe.slug}/print?${params.toString()}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  /**
   * Handle fork button click
   * Creates a copy of the recipe that the user can then edit
   */
  const handleFork = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setForking(true);

    try {
      // Get user's username for slug generation
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.username) {
        alert('User profile not found. Please complete your profile setup.');
        setForking(false);
        return;
      }

      const forkIngredients = ingredients.map((ing) => ({
        name: ing.name,
        amount: ing.display_amount,
      }));
      const forkValidation = validateRecipePayload({
        title: recipe.title,
        ingredients: forkIngredients,
      });
      if (!forkValidation.ok) {
        alert(forkValidation.error);
        setForking(false);
        return;
      }

      const usernameSlug = profile.username
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '');
      const recipeTitleSlug = recipe.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const forkedSlug = `${usernameSlug}-${recipeTitleSlug}-Copied-${Date.now()}`;

      const { data: newRecipe, error: createError } = await supabaseClient
        .from('recipes')
        .insert({
          user_id: user.id,
          title: `${recipe.title} (Copied)`,
          slug: forkedSlug,
          description: recipe.description,
          image_url: recipe.image_url,
          tags: recipe.tags,
          method_steps: recipe.method_steps,
          method_step_image_urls: recipe.method_step_image_urls ?? [],
          notes: recipe.notes,
          copied_from_recipe_id: recipe.id,
          is_public: true,
        })
        .select()
        .single();

      if (createError || !newRecipe) {
        console.error('Error creating forked recipe:', createError);
        alert('Failed to create forked recipe. Please try again.');
        setForking(false);
        return;
      }

      if (ingredients.length > 0) {
        const ingredientsData = ingredients.map((ing) => ({
          recipe_id: newRecipe.id,
          name: ing.name,
          amount_grams: ing.amount_grams,
          unit: ing.unit,
          display_amount: ing.display_amount,
          order_index: ing.order_index,
        }));

        await supabaseClient
          .from('ingredients')
          .insert(ingredientsData);
      }

      // Navigate to the newly forked recipe page using slug
      router.push(`/recipe/${newRecipe.slug}`);
    } catch (err) {
      console.error('Unexpected error forking recipe:', err);
      alert('An unexpected error occurred. Please try again.');
      setForking(false);
    }
  };

  return (
    <RecipeTimerContext.Provider value={timerContextValue}>
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-4xl">
      <RecipeTutorial />
      {/* Recipe Image */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        {recipe.image_url ? (
          <Image
            src={recipe.image_url}
            alt={displayRecipe.title}
            width={800}
            height={600}
            className="w-full h-48 sm:h-64 md:h-80 lg:h-96 object-cover rounded-lg"
          />
        ) : (
          <div className="w-full h-48 sm:h-64 md:h-80 lg:h-96 bg-base-300 rounded-lg flex items-center justify-center">
            <span className="text-base-content opacity-50 text-base sm:text-lg">No Image</span>
          </div>
        )}
      </div>

      {/* Recipe Title and Actions */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-3 mb-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold special-elite-regular break-words text-base-content">{displayRecipe.title}</h1>
          <div className="flex gap-1.5 sm:gap-2 flex-wrap">
            {/* Wake Lock Button */}
            <button
              onClick={toggleWakeLock}
              data-tour="wakelock"
              className={`btn btn-circle ${wakeLockActive ? 'btn-primary' : 'btn-ghost'}`}
              aria-pressed={wakeLockActive}
              aria-label={wakeLockActive ? 'Disable always on' : 'Enable always on'}
              title={wakeLockSupported ? (wakeLockActive ? 'Always on enabled' : 'Keep screen awake') : 'Always on not supported'}
              disabled={!wakeLockSupported}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
                {wakeLockActive && (
                  <circle cx="12" cy="10" r="2" fill="currentColor" stroke="none" />
                )}
              </svg>
            </button>
            {/* Timer Chime Mute Toggle */}
            <button
              onClick={toggleTimerMute}
              data-tour="mute"
              className={`btn btn-circle ${timerMuted ? 'btn-ghost' : 'btn-primary'}`}
              aria-pressed={!timerMuted}
              aria-label={timerMuted ? 'Unmute timer chime' : 'Mute timer chime'}
              title={timerMuted ? 'Timer chime muted' : 'Timer chime on'}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5L6 9H2v6h4l5 4V5z"
                />
                {timerMuted ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M23 9l-6 6M17 9l6 6"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"
                  />
                )}
              </svg>
            </button>
            {/* Fork Button */}
            <button
              onClick={() => forkConfirmRef.current?.showModal()}
              data-tour="fork"
              className="btn btn-circle btn-ghost"
              aria-label="Fork recipe"
              title="Create your own version"
              disabled={forking}
            >
              {forking ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle
                    cx="12"
                    cy="18"
                    r="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                  <circle
                    cx="6"
                    cy="6"
                    r="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                  <circle
                    cx="18"
                    cy="6"
                    r="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 12v3"
                  />
                </svg>
              )}
            </button>
            {/* Print Button */}
            <button
              onClick={handlePrint}
              data-tour="print"
              className="btn btn-circle btn-ghost"
              aria-label="Print recipe"
              title="Print this recipe"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z"
                />
              </svg>
            </button>
            {/* Edit Button - Only show for recipe owner */}
            {isOwner && (
              <Link
                href={`/recipe/${recipe.slug}/edit`}
                className="btn btn-circle btn-ghost"
                aria-label="Edit recipe"
                title="Edit this recipe"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </Link>
            )}
            {/* Favorite Button */}
            <button
              onClick={toggleFavorite}
              data-tour="favorite"
              className={`btn btn-circle ${isFavorited ? 'btn-primary' : 'btn-ghost'}`}
              aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg
                className={`w-6 h-6 ${isFavorited ? 'fill-current' : ''}`}
                fill={isFavorited ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base sm:text-lg opacity-70 arial-font">by</span>
          <Link
            href={`/profile/${owner.username}`}
            className="link link-primary text-base sm:text-lg arial-font break-all"
          >
            {owner.username}
          </Link>
        </div>
        <div className="mt-2 text-sm opacity-60">
          {viewCount} {viewCount === 1 ? 'view' : 'views'}
        </div>

        {/* Servings / timing metadata strip (chips only render when set) */}
        {hasMetaStrip && (
          <div className="mt-3 flex flex-wrap gap-2">
            {baseServings != null && (
              <span className="badge badge-ghost badge-lg arial-font">
                {baseServings} {baseServings === 1 ? 'Serving' : 'Servings'}
              </span>
            )}
            {prepMinutes != null && (
              <span className="badge badge-ghost badge-lg arial-font">
                Prep {prepMinutes} min
              </span>
            )}
            {cookMinutes != null && (
              <span className="badge badge-ghost badge-lg arial-font">
                Cook {cookMinutes} min
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tags */}
      {recipe.tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {recipe.tags.map((tag, index) => (
            <span
              key={index}
              className="badge badge-outline arial-font"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      {displayRecipe.description && (
        <p className="mb-6 sm:mb-8 text-base sm:text-lg arial-font break-words">{displayRecipe.description}</p>
      )}

      {/* Ingredients Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-4">
          <h2 className="text-xl sm:text-2xl font-bold special-elite-regular">Ingredients</h2>
          {/* Multiplier Controls */}
          <div className="flex flex-wrap items-center gap-2" data-tour="multiplier">
            <span className="text-sm opacity-70 arial-font mr-2 w-full sm:w-auto">Scale:</span>
            <button
              onClick={() => handleMultiplierClick(0.5)}
              className={`btn btn-sm ${multiplier === 0.5 && !showCustomInput ? 'btn-primary' : 'btn-outline'}`}
            >
              0.5x
            </button>
            <button
              onClick={() => handleMultiplierClick(1)}
              className={`btn btn-sm ${multiplier === 1 && !showCustomInput ? 'btn-primary' : 'btn-outline'}`}
            >
              1x
            </button>
            <button
              onClick={() => handleMultiplierClick(2)}
              className={`btn btn-sm ${multiplier === 2 && !showCustomInput ? 'btn-primary' : 'btn-outline'}`}
            >
              2x
            </button>
            {showCustomInput ? (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="input input-bordered input-sm w-28 arial-font flex-shrink-0"
                  placeholder="Custom"
                  value={customMultiplier}
                  onChange={(e) => handleCustomMultiplierChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={handleCustomInputToggle}
                  className="btn btn-sm btn-ghost flex-shrink-0"
                  title="Close custom input"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={handleCustomInputToggle}
                className={`btn btn-sm ${showCustomInput ? 'btn-primary' : 'btn-outline'} flex-shrink-0`}
                title="Enter custom multiplier"
              >
                Custom
              </button>
            )}
          </div>
        </div>
        {hasUnitOverrides && lastChangedUnit && (
          <button
            type="button"
            onClick={applyUnitToAll}
            className="btn btn-sm btn-outline mb-3 arial-font"
          >
            Apply to all
          </button>
        )}
        <ul className="space-y-3">
          {displayIngredients.map((ingredient, ingredientIndex) => {
            const { amount, unit, showWarning } = getDisplayAmount(ingredient);
            const isChecked = checkedIngredients.has(ingredient.id);
            const availableUnits = getAvailableUnits(ingredient);
            const currentUnit = ingredientUnits[ingredient.id] || ingredient.unit;
            const hideUnit = isHiddenUnit(ingredient.unit);
            const displayText = isHiddenUnit(unit)
              ? formatAmountOnly(amount)
              : formatMeasurement(amount, unit);

            return (
              <li key={ingredient.id} className="flex flex-row items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleIngredient(ingredient.id)}
                  className="checkbox checkbox-sm flex-shrink-0"
                />
                <span className={`${isChecked ? 'line-through opacity-50' : ''} arial-font break-words flex-1 min-w-0 text-sm sm:text-base`}>
                  {displayText} {ingredient.name}
                  {showWarning && (
                    <span className="text-warning ml-1" title="Converted between volume and weight - may not be exact">
                      *
                    </span>
                  )}
                </span>
                {!hideUnit && (
                  <select
                    value={currentUnit}
                    onChange={(e) => changeIngredientUnit(ingredient.id, e.target.value)}
                    data-tour={ingredientIndex === 0 ? 'units' : undefined}
                    className="select select-bordered select-sm w-auto min-w-[4.25rem] max-w-[5.5rem] arial-font flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {availableUnits.map((unitOption) => (
                      <option key={unitOption} value={unitOption}>
                        {unitOption}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            );
          })}
        </ul>
        {Object.values(unitWarnings).some(w => w.originalIsVolume !== w.currentIsVolume) && (
          <div className="mt-4 alert alert-warning">
            <span className="text-sm arial-font">
              <span className="text-warning font-bold">*</span> Indicates conversion between volume and weight measurements. 
              These conversions are approximate and may vary based on ingredient density.
            </span>
          </div>
        )}
      </div>

      {/* Method Section */}
      <div className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 special-elite-regular">Method</h2>
        <ol className="list-decimal list-outside ml-5 sm:ml-6 space-y-3">
          {displayRecipe.method_steps.map((step, index) => {
            const stepImageUrl = recipe.method_step_image_urls?.[index] ?? null;
            return (
            <li key={index} className="text-base sm:text-lg arial-font break-words pl-1">
              <div className={`${stepImageUrl ? 'flex flex-col lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start' : ''}`}>
                <div className="min-w-0">
                  <StepTimers
                    step={step}
                    index={index}
                    preferredTemperatureUnit={preferredTemperatureUnit}
                  />
                </div>
                {stepImageUrl && (
                  <button
                    type="button"
                    onClick={() => setStepLightboxUrl(stepImageUrl)}
                    className="mt-3 lg:mt-0 block w-full text-left rounded-lg overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={`View image for step ${index + 1}`}
                  >
                    <img
                      src={stepImageUrl}
                      alt={`Step ${index + 1}`}
                      className="rounded-lg object-cover w-full max-h-64 lg:max-h-80 hover:opacity-95 transition-opacity cursor-zoom-in"
                    />
                  </button>
                )}
              </div>
            </li>
            );
          })}
        </ol>
        {stepLightboxUrl && (
          <StepImageLightbox
            imageUrl={stepLightboxUrl}
            alt="Step image"
            onClose={() => setStepLightboxUrl(null)}
          />
        )}
      </div>

      {/* Nutrition Section (viewer opt-in + creator opt-out) */}
      {nutritionEnabled && recipe.nutrition_visible !== false && (
        <NutritionPanel
          ingredients={displayIngredients.map((ing) => ({
            name: ing.name,
            amount_grams: ing.amount_grams,
          }))}
          servings={baseServings ?? null}
        />
      )}

      {/* Notes Section */}
      {(displayRecipe.notes.length > 0 || copySource) && (
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 special-elite-regular">Notes</h2>
          <ol className="list-decimal list-outside ml-5 sm:ml-6 space-y-2">
            {displayRecipe.notes.map((note, index) => (
              <li key={index} className="opacity-80 arial-font break-words pl-1 text-sm sm:text-base">
                {note}
              </li>
            ))}
            {copySource && (
              <li className="opacity-80 arial-font break-words pl-1 text-sm sm:text-base">
                <RecipeCopyAttributionNote source={copySource} />
              </li>
            )}
          </ol>
        </div>
      )}

      {/* Ratings & Reviews Section */}
      <RecipeRatings
        recipeId={recipe.id}
        isOwner={isOwner}
        isPublic={recipe.is_public !== false}
        initialStats={initialRatingStats ?? undefined}
      />

      {/* Fork Confirmation Dialog */}
      <dialog ref={forkConfirmRef} className="modal modal-bottom sm:modal-middle">
        <div className="modal-box border border-primary/30 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold special-elite-regular text-base-content">
              Copy this recipe?
            </h3>
          </div>
          <p className="text-sm opacity-75 arial-font mb-6">
            A copy of{' '}
            <span className="font-semibold text-primary">
              {displayRecipe.title}
            </span>{' '}
            will be added to your recipes. A note linking back to the original
            will be added at the end of your notes. You can edit the copy freely
            without affecting the original.
          </p>
          <div className="modal-action mt-0 gap-3">
            <form method="dialog">
              <button className="btn btn-ghost btn-sm">No, cancel</button>
            </form>
            <button
              className="btn btn-primary btn-sm gap-2"
              disabled={forking}
              onClick={() => {
                forkConfirmRef.current?.close();
                handleFork();
              }}
            >
              {forking ? (
                <span className="loading loading-spinner loading-xs" />
              ) : null}
              Yes, copy it
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
    </RecipeTimerContext.Provider>
  );
}
