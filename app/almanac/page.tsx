/**
 * Almanac Page Component
 * 
 * Displays the user's personal recipe collection:
 * - "My Recipes" tab: Shows all recipes created by the logged-in user
 * - "Favorites" tab: Shows all recipes the user has favorited
 * 
 * Features:
 * - Add Recipe button to create new recipes
 * - Tab-based filtering between own recipes and favorites
 * - Recipe count display for each tab
 * - Empty state messages when no recipes exist
 * 
 * This is a Client Component because it needs to:
 * - Access user authentication state
 * - Handle user interactions (tabs, navigation)
 * - Fetch user-specific data from Supabase
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabase-client';
import type { Session } from '@supabase/supabase-js';
import RecipeCard from '@/components/RecipeCard';

/**
 * Recipe interface matching the database schema
 * Note: Supabase may return profiles as an array or single object depending on the query
 */
interface Recipe {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  description: string | null;
  view_count: number;
  tags: string[];
  profiles: {
    username: string;
  } | {
    username: string;
  }[] | null;
}

/**
 * Normalized recipe interface with profiles as a single object
 */
interface NormalizedRecipe {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  description: string | null;
  view_count: number;
  tags: string[];
  profiles: {
    username: string;
  };
}

export default function AlmanacPage() {
  // Current authenticated user
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  
  // Active filter tab: 'my-recipes' or 'favorites'
  const [filter, setFilter] = useState<'my-recipes' | 'favorites'>('my-recipes');
  
  // User's own recipes (normalized with single profiles object)
  const [myRecipes, setMyRecipes] = useState<NormalizedRecipe[]>([]);
  
  // User's favorited recipes (normalized with single profiles object)
  const [favoriteRecipes, setFavoriteRecipes] = useState<NormalizedRecipe[]>([]);
  
  /**
   * Normalize recipe data from Supabase
   * Converts profiles from array to single object if needed
   */
  const normalizeRecipe = (recipe: Recipe): NormalizedRecipe | null => {
    if (!recipe) return null;
    
    // Handle profiles - Supabase may return it as an array or single object
    let profiles: { username: string } | null = null;
    
    if (Array.isArray(recipe.profiles)) {
      // If it's an array, take the first element
      profiles = recipe.profiles[0] || null;
    } else if (recipe.profiles) {
      // If it's already a single object, use it directly
      profiles = recipe.profiles;
    }
    
    // If no profile found, skip this recipe (shouldn't happen, but safety check)
    if (!profiles) {
      console.warn('Recipe missing profile data:', recipe.id);
      return null;
    }
    
    return {
      id: recipe.id,
      slug: recipe.slug,
      title: recipe.title,
      image_url: recipe.image_url,
      description: recipe.description,
      view_count: recipe.view_count,
      tags: recipe.tags,
      profiles,
    };
  };
  
  // Loading state for initial data fetch
  const [loading, setLoading] = useState(true);
  
  // Error state for displaying error messages
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch user data and recipes on component mount
   * Also listens for auth state changes to update recipes when user logs in/out
   */
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setError(null);
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        
        if (userError) {
          console.error('Error fetching user:', userError);
          setError('Failed to load user data');
          setLoading(false);
          return;
        }
        
        setUser(user);
        
        // Fetch recipes if user is logged in
        if (user) {
          await Promise.all([
            fetchMyRecipes(user.id),
            fetchFavoriteRecipes(user.id),
          ]);
        }
      } catch (err) {
        console.error('Error in fetchUser:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    // Listen for authentication state changes (login, logout, etc.)
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Refresh recipes when user logs in
        Promise.all([
          fetchMyRecipes(session.user.id),
          fetchFavoriteRecipes(session.user.id),
        ]).catch((err) => {
          console.error('Error refreshing recipes:', err);
        });
      } else {
        // Clear recipes when user logs out
        setMyRecipes([]);
        setFavoriteRecipes([]);
      }
    });

    // Cleanup: unsubscribe from auth state changes
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Fetch all recipes created by the current user
   * @param userId - The ID of the user whose recipes to fetch
   */
  const fetchMyRecipes = async (userId: string) => {
    try {
      const { data, error } = await supabaseClient
        .from('recipes')
        .select(`
          id,
          slug,
          title,
          image_url,
          description,
          view_count,
          tags,
          profiles:user_id (
            username
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching my recipes:', error);
        setError('Failed to load your recipes');
        return;
      }

      // Normalize recipes and filter out any null values
      // Use 'unknown' first to safely convert from Supabase's return type
      const recipes = (data || []) as unknown as Recipe[];
      const normalizedRecipes = recipes
        .map((recipe: Recipe) => normalizeRecipe(recipe))
        .filter((recipe): recipe is NormalizedRecipe => recipe !== null);
      
      setMyRecipes(normalizedRecipes);
    } catch (err) {
      console.error('Unexpected error fetching my recipes:', err);
      setError('An unexpected error occurred while loading recipes');
    }
  };

  /**
   * Fetch all recipes that the user has favorited
   * First gets the list of favorited recipe IDs, then fetches the full recipe data
   * @param userId - The ID of the user whose favorites to fetch
   */
  const fetchFavoriteRecipes = async (userId: string) => {
    try {
      // Step 1: Get list of favorited recipe IDs
      const { data: savedData, error: savedError } = await supabaseClient
        .from('saved_recipes')
        .select('recipe_id')
        .eq('user_id', userId);

      if (savedError) {
        console.error('Error fetching saved recipes:', savedError);
        setError('Failed to load favorites');
        return;
      }

      // If no favorites, set empty array and return
      if (!savedData || savedData.length === 0) {
        setFavoriteRecipes([]);
        return;
      }

      // Step 2: Fetch full recipe data for favorited recipes
      const recipeIds = savedData.map((item: { recipe_id: string }) => item.recipe_id);
      const { data, error } = await supabaseClient
        .from('recipes')
        .select(`
          id,
          slug,
          title,
          image_url,
          description,
          view_count,
          tags,
          profiles:user_id (
            username
          )
        `)
        .in('id', recipeIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching favorite recipes:', error);
        setError('Failed to load favorite recipes');
        return;
      }

      // Normalize recipes and filter out any null values
      // Use 'unknown' first to safely convert from Supabase's return type
      const recipes = (data || []) as unknown as Recipe[];
      const normalizedRecipes = recipes
        .map((recipe: Recipe) => normalizeRecipe(recipe))
        .filter((recipe): recipe is NormalizedRecipe => recipe !== null);
      
      setFavoriteRecipes(normalizedRecipes);
    } catch (err) {
      console.error('Unexpected error fetching favorite recipes:', err);
      setError('An unexpected error occurred while loading favorites');
    }
  };

  // Loading state: show spinner while fetching data
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  // Not logged in: show message prompting user to log in
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-warning">
          <span>Please log in to view your almanac</span>
        </div>
        <div className="text-center mt-4">
          <Link href="/login" className="btn btn-primary">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  // Error state: show error message if something went wrong
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
        <div className="text-center mt-4">
          <button 
            className="btn btn-primary"
            onClick={() => {
              setError(null);
              if (user) {
                Promise.all([
                  fetchMyRecipes(user.id),
                  fetchFavoriteRecipes(user.id),
                ]);
              }
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const currentRecipes = filter === 'my-recipes' ? myRecipes : favoriteRecipes;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold leading-none flex items-center">My Almanac</h1>
        <Link href="/recipe/create" className="btn btn-primary">
          + Add Recipe
        </Link>
      </div>
      
      {/* Filter Tabs */}
      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab ${filter === 'my-recipes' ? 'tab-active' : ''}`}
          onClick={() => setFilter('my-recipes')}
        >
          My Recipes ({myRecipes.length})
        </button>
        <button
          className={`tab ${filter === 'favorites' ? 'tab-active' : ''}`}
          onClick={() => setFilter('favorites')}
        >
          Favorites ({favoriteRecipes.length})
        </button>
      </div>

      {/* Recipe List */}
      {currentRecipes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg opacity-70 mb-4">
            {filter === 'my-recipes' 
              ? "You haven't created any recipes yet." 
              : "You haven't favorited any recipes yet."}
          </p>
          {filter === 'my-recipes' && (
            <Link href="/recipe/create" className="btn btn-primary">
              Create Your First Recipe
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentRecipes.map((recipe: NormalizedRecipe) => (
            <RecipeCard
              key={recipe.id}
              id={recipe.id}
              slug={recipe.slug}
              title={recipe.title}
              imageUrl={recipe.image_url}
              description={recipe.description}
              username={recipe.profiles.username}
              viewCount={recipe.view_count}
              tags={recipe.tags}
            />
          ))}
        </div>
      )}
    </div>
  );
}

