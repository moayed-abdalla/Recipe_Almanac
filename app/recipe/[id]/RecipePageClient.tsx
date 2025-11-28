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
}: RecipePageClientProps) {
  const router = useRouter();
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [isFavorited, setIsFavorited] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [forking, setForking] = useState(false);
  
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
   * Get display amount for an ingredient based on selected unit
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

      // Create a new recipe based on the original
      const { data: newRecipe, error: createError } = await supabaseClient
        .from('recipes')
        .insert({
          user_id: user.id,
          title: `${originalRecipe.title} (Forked)`,
          slug: `${originalRecipe.slug || originalRecipe.title.toLowerCase().replace(/\s+/g, '-')}-forked-${Date.now()}`,
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
        const ingredientsData = originalRecipe.ingredients.map((ing: any) => ({
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

      // Navigate to the newly forked recipe page
      router.push(`/recipe/${newRecipe.id}`);
    } catch (err) {
      console.error('Unexpected error forking recipe:', err);
      alert('An unexpected error occurred. Please try again.');
      setForking(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Recipe Image */}
      <div className="mb-8">
        {recipe.image_url ? (
          <Image
            src={recipe.image_url}
            alt={recipe.title}
            width={800}
            height={600}
            className="w-full h-96 object-cover rounded-lg"
          />
        ) : (
          <div className="w-full h-96 bg-base-300 rounded-lg flex items-center justify-center">
            <span className="text-base-content opacity-50 text-xl">No Image</span>
          </div>
        )}
      </div>

      {/* Recipe Title and Actions */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-2 gap-4">
          <h1 className="text-4xl font-bold flex-1">{recipe.title}</h1>
          <div className="flex gap-2">
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
          <span className="text-lg opacity-70">by</span>
          <Link
            href={`/profile/${owner.username}`}
            className="link link-primary text-lg"
          >
            {owner.username}
          </Link>
        </div>
        <div className="mt-2 text-sm opacity-60">
          {recipe.view_count} views
        </div>
      </div>

      {/* Tags */}
      {recipe.tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {recipe.tags.map((tag, index) => (
            <span
              key={index}
              className="badge badge-outline"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      {recipe.description && (
        <p className="mb-8 text-lg">{recipe.description}</p>
      )}

      {/* Ingredients Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Ingredients</h2>
        <ul className="space-y-3">
          {ingredients.map((ingredient) => {
            const { amount, unit, showWarning } = getDisplayAmount(ingredient);
            const isChecked = checkedIngredients.has(ingredient.id);
            const availableUnits = getAvailableUnits(ingredient);
            const currentUnit = ingredientUnits[ingredient.id] || ingredient.unit;

            return (
              <li key={ingredient.id} className="flex items-center gap-3 flex-wrap">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleIngredient(ingredient.id)}
                  className="checkbox"
                />
                <span className={isChecked ? 'line-through opacity-50 flex-1' : 'flex-1'}>
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
                  className="select select-bordered select-sm max-w-xs"
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
            <span className="text-sm">
              <span className="text-warning font-bold">*</span> Indicates conversion between volume and weight measurements. 
              These conversions are approximate and may vary based on ingredient density.
            </span>
          </div>
        )}
      </div>

      {/* Method Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Method</h2>
        <ol className="list-decimal list-inside space-y-3">
          {recipe.method_steps.map((step, index) => (
            <li key={index} className="text-lg">
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Notes Section */}
      {recipe.notes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Notes</h2>
          <ol className="list-decimal list-inside space-y-2">
            {recipe.notes.map((note, index) => (
              <li key={index} className="opacity-80">
                {note}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
