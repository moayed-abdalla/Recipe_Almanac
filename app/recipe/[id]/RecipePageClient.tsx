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
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { formatMeasurement, convertUnit, VOLUME_UNITS, INGREDIENT_DENSITIES } from '@/utils/unitConverter';

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
  notes: string[];
  view_count: number;
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
}

// Available unit options for conversion
const UNIT_OPTIONS = {
  weight: ['g', 'kg', 'oz', 'lb'],
  volume: ['cup', 'cups', 'tbsp', 'tsp', 'ml', 'fl oz'],
};

export default function RecipePageClient({
  recipe,
  ingredients,
  owner,
  isOwner,
}: RecipePageClientProps) {
  const router = useRouter();
  
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
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [isFavorited, setIsFavorited] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [forking, setForking] = useState(false);
  
  // Ingredient multiplier state (default 1x)
  const [multiplier, setMultiplier] = useState<number>(1);
  const [customMultiplier, setCustomMultiplier] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  
  // Per-ingredient unit conversion state
  // Key: ingredient ID, Value: selected unit
  const [ingredientUnits, setIngredientUnits] = useState<Record<string, string>>({});
  
  // Track if ingredient has been converted from original unit type
  // Key: ingredient ID, Value: { originalIsVolume: boolean, currentIsVolume: boolean }
  const [unitWarnings, setUnitWarnings] = useState<Record<string, { originalIsVolume: boolean; currentIsVolume: boolean }>>({});

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
  }, [ingredients]);

  /**
   * Check if the current user has favorited this recipe
   * Runs on component mount and when recipe ID changes
   */
  useEffect(() => {
    const checkFavorite = async () => {
      try {
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        
        if (userError) {
          console.error('Error getting user:', userError);
          setLoading(false);
          return;
        }
        
        setUser(user);
        
        // Check if recipe is in user's favorites
        if (user) {
          const { data, error } = await supabaseClient
            .from('saved_recipes')
            .select('id')
            .eq('user_id', user.id)
            .eq('recipe_id', recipe.id)
            .single();
          
          // If data exists, recipe is favorited
          // If error is "PGRST116" (no rows returned), recipe is not favorited
          setIsFavorited(!!data && !error);
        }
      } catch (err) {
        console.error('Error checking favorite status:', err);
      } finally {
        setLoading(false);
      }
    };

    checkFavorite();
  }, [recipe.id]);

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

    const currentUnit = ingredientUnits[ingredientId] || ingredient.unit;
    const originalIsVolume = VOLUME_UNITS[ingredient.unit.toLowerCase()] !== undefined;
    const currentIsVolume = VOLUME_UNITS[currentUnit.toLowerCase()] !== undefined;
    const newIsVolume = VOLUME_UNITS[newUnit.toLowerCase()] !== undefined;

    // Update unit
    setIngredientUnits(prev => ({
      ...prev,
      [ingredientId]: newUnit,
    }));

    // Update warning state if switching between volume and weight
    setUnitWarnings(prev => ({
      ...prev,
      [ingredientId]: {
        originalIsVolume,
        currentIsVolume: newIsVolume,
      },
    }));
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
   */
  const getDisplayAmount = (ingredient: Ingredient): { amount: number; unit: string; showWarning: boolean } => {
    const selectedUnit = ingredientUnits[ingredient.id] || ingredient.unit;
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

  /**
   * Get available units for an ingredient based on its original unit type
   */
  const getAvailableUnits = (ingredient: Ingredient): string[] => {
    const originalIsVolume = VOLUME_UNITS[ingredient.unit.toLowerCase()] !== undefined;
    const hasDensity = INGREDIENT_DENSITIES[ingredient.name.toLowerCase()] !== undefined;
    
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

      // Fetch the original recipe with all its data
      const { data: originalRecipe, error: fetchError } = await supabaseClient
        .from('recipes')
        .select('*, ingredients(*)')
        .eq('id', recipe.id)
        .single();

      if (fetchError || !originalRecipe) {
        console.error('Error fetching recipe:', fetchError);
        alert('Failed to fetch recipe. Please try again.');
        setForking(false);
        return;
      }

      // Generate slug for forked recipe: username-recipe-title-forked-timestamp
      // Convert username to lowercase first, then replace non-alphanumeric characters
      const usernameSlug = profile.username
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, ''); // Remove leading/trailing underscores
      const recipeTitleSlug = originalRecipe.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const forkedSlug = `${usernameSlug}-${recipeTitleSlug}-forked-${Date.now()}`;

      // Create a new recipe based on the original
      const { data: newRecipe, error: createError } = await supabaseClient
        .from('recipes')
        .insert({
          user_id: user.id,
          title: `${originalRecipe.title} (Forked)`,
          slug: forkedSlug,
          description: originalRecipe.description,
          image_url: originalRecipe.image_url,
          tags: originalRecipe.tags,
          method_steps: originalRecipe.method_steps,
          notes: originalRecipe.notes,
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

      // Copy all ingredients to the new recipe
      if (originalRecipe.ingredients && originalRecipe.ingredients.length > 0) {
        const ingredientsData = originalRecipe.ingredients.map((ing: { name: string; amount_grams: number; unit: string; display_amount: number; order_index: number }) => ({
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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-4xl">
      {/* Recipe Image */}
      <div className="mb-6 sm:mb-8">
        {recipe.image_url ? (
          <Image
            src={recipe.image_url}
            alt={recipe.title}
            width={800}
            height={600}
            className="w-full h-64 sm:h-80 lg:h-96 object-cover rounded-lg"
          />
        ) : (
          <div className="w-full h-64 sm:h-80 lg:h-96 bg-base-300 rounded-lg flex items-center justify-center">
            <span className="text-base-content opacity-50 text-lg sm:text-xl">No Image</span>
          </div>
        )}
      </div>

      {/* Recipe Title and Actions */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-2 gap-3 sm:gap-4">
          <h1 className="text-3xl sm:text-4xl font-bold flex-1 special-elite-regular break-words">{recipe.title}</h1>
          <div className="flex gap-2 flex-shrink-0">
            {/* Fork Button */}
            <button
              onClick={handleFork}
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
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
              className={`btn btn-circle ${isFavorited ? 'btn-primary' : 'btn-ghost'}`}
              aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              disabled={loading}
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
        <div className="flex items-center gap-2">
          <span className="text-lg opacity-70 arial-font">by</span>
          <Link
            href={`/profile/${owner.username}`}
            className="link link-primary text-lg arial-font"
          >
            {owner.username}
          </Link>
        </div>
        {/* COMMENTED OUT: View count display disabled */}
        {/* <div className="mt-2 text-sm opacity-60">
          {recipe.view_count} views
        </div> */}
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
      {recipe.description && (
        <p className="mb-8 text-lg arial-font">{recipe.description}</p>
      )}

      {/* Ingredients Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-4">
          <h2 className="text-2xl font-bold special-elite-regular">Ingredients</h2>
          {/* Multiplier Controls */}
          <div className="flex flex-wrap items-center gap-2">
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
                  className="input input-bordered input-sm w-20 arial-font flex-shrink-0"
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
        <ul className="space-y-3">
          {ingredients.map((ingredient) => {
            const { amount, unit, showWarning } = getDisplayAmount(ingredient);
            const isChecked = checkedIngredients.has(ingredient.id);
            const availableUnits = getAvailableUnits(ingredient);
            const currentUnit = ingredientUnits[ingredient.id] || ingredient.unit;

            return (
              <li key={ingredient.id} className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleIngredient(ingredient.id)}
                  className="checkbox flex-shrink-0"
                />
                <span className={`${isChecked ? 'line-through opacity-50 flex-1 min-w-0' : 'flex-1 min-w-0'} arial-font break-words`}>
                  {formatMeasurement(amount, unit)} {ingredient.name}
                  {showWarning && (
                    <span className="text-warning ml-1" title="Converted between volume and weight - may not be exact">
                      *
                    </span>
                  )}
                </span>
                <select
                  value={currentUnit}
                  onChange={(e) => changeIngredientUnit(ingredient.id, e.target.value)}
                  className="select select-bordered select-sm max-w-xs arial-font flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {availableUnits.map((unitOption) => (
                    <option key={unitOption} value={unitOption}>
                      {unitOption}
                    </option>
                  ))}
                </select>
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
        <h2 className="text-2xl font-bold mb-4 special-elite-regular">Method</h2>
        <ol className="list-decimal list-inside space-y-3">
          {recipe.method_steps.map((step, index) => (
            <li key={index} className="text-lg arial-font">
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Notes Section */}
      {recipe.notes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 special-elite-regular">Notes</h2>
          <ol className="list-decimal list-inside space-y-2">
            {recipe.notes.map((note, index) => (
              <li key={index} className="opacity-80 arial-font">
                {note}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
