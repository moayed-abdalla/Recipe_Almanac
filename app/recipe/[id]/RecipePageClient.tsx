/**
 * Recipe Page Client Component
 * 
 * Displays a full recipe view with:
 * - Recipe image
 * - Title, author, and view count
 * - Star button to favorite/unfavorite
 * - Tags
 * - Description
 * - Ingredients list with unit conversion toggle
 * - Method steps
 * - Optional notes
 * 
 * Features:
 * - Toggle between volume and weight measurements
 * - Check off ingredients as you use them
 * - Favorite/unfavorite functionality
 * - Responsive design
 * 
 * This is a Client Component because it needs to:
 * - Handle user interactions (favorites, unit conversion, ingredient checking)
 * - Access authentication state
 * - Manage local UI state
 */

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { formatMeasurement, convertUnit } from '@/utils/unitConverter';

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

export default function RecipePageClient({
  recipe,
  ingredients,
  owner,
}: RecipePageClientProps) {
  const router = useRouter();
  const [unitSystem, setUnitSystem] = useState<'volume' | 'weight'>('volume');
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [isFavorited, setIsFavorited] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const toggleUnitSystem = () => {
    setUnitSystem(unitSystem === 'volume' ? 'weight' : 'volume');
  };

  /**
   * Toggle favorite status for the current recipe
   * Adds recipe to favorites if not favorited, removes if already favorited
   */
  const toggleFavorite = async () => {
    // Redirect to login if user is not authenticated
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      if (isFavorited) {
        // Remove from favorites
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
        // Add to favorites
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

      {/* Recipe Title and Owner */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-4xl font-bold">{recipe.title}</h1>
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Ingredients</h2>
          <button
            onClick={toggleUnitSystem}
            className="btn btn-sm btn-outline"
          >
            Switch to {unitSystem === 'volume' ? 'Weight (g)' : 'Volume'}
          </button>
        </div>
        <ul className="space-y-2">
          {ingredients.map((ingredient) => {
            const displayAmount =
              unitSystem === 'volume'
                ? ingredient.display_amount
                : convertUnit(
                    ingredient.amount_grams,
                    'g',
                    ingredient.unit,
                    ingredient.name
                  );
            const displayUnit = unitSystem === 'volume' ? ingredient.unit : 'g';
            const isChecked = checkedIngredients.has(ingredient.id);

            return (
              <li key={ingredient.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleIngredient(ingredient.id)}
                  className="checkbox"
                />
                <span
                  className={isChecked ? 'line-through opacity-50' : ''}
                >
                  {formatMeasurement(displayAmount, displayUnit)} {ingredient.name}
                </span>
              </li>
            );
          })}
        </ul>
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

