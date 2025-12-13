/**
 * My Almanac Page Component
 * 
 * Displays the authenticated user's personal recipe collection:
 * - "Favorites" tab: Shows all recipes the user has favorited
 * - "Public Recipes" tab: Shows all public recipes created by the user
 * - "Private Recipes" tab: Shows all private recipes created by the user
 * 
 * Features:
 * - Add Recipe button to create new recipes
 * - Tab-based filtering between favorites, public, and private recipes
 * - Recipe count display for each tab
 * - Empty state messages when no recipes exist
 * - Requires login to access
 * 
 * This is a Client Component because it needs to:
 * - Access user authentication state
 * - Handle user interactions (tabs, navigation)
 * - Fetch user-specific data from Supabase
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import type { Session } from '@supabase/supabase-js';
import RecipeCard from '@/components/RecipeCard';

/**
 * Recipe interface matching the database schema
 */
interface Recipe {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  description: string | null;
  view_count: number;
  tags: string[];
  is_public: boolean;
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
  is_public: boolean;
  profiles: {
    username: string;
  };
}

export default function MyAlmanacPage() {
  const router = useRouter();
  
  // Current authenticated user
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  
  // Active filter tab: 'favorites', 'public', or 'private'
  const [filter, setFilter] = useState<'favorites' | 'public' | 'private'>('favorites');
  
  // User's favorited recipes
  const [favoriteRecipes, setFavoriteRecipes] = useState<NormalizedRecipe[]>([]);
  
  // User's public recipes
  const [publicRecipes, setPublicRecipes] = useState<NormalizedRecipe[]>([]);
  
  // User's private recipes
  const [privateRecipes, setPrivateRecipes] = useState<NormalizedRecipe[]>([]);
  
  /**
   * Normalize recipe data from Supabase
   */
  const normalizeRecipe = (recipe: Recipe): NormalizedRecipe | null => {
    if (!recipe) return null;
    
    let profiles: { username: string } | null = null;
    
    if (Array.isArray(recipe.profiles)) {
      profiles = recipe.profiles[0] || null;
    } else if (recipe.profiles) {
      profiles = recipe.profiles;
    }
    
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
      is_public: recipe.is_public,
      profiles,
    };
  };
  
  // Loading state for initial data fetch
  const [loading, setLoading] = useState(true);
  
  // Error state for displaying error messages
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch user data and recipes on component mount
   */
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setError(null);
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        
        if (userError || !user) {
          console.error('Error fetching user:', userError);
          router.push('/login');
          return;
        }
        
        setUser(user);
        
        // Fetch all recipes
        await Promise.all([
          fetchFavoriteRecipes(user.id),
          fetchPublicRecipes(user.id),
          fetchPrivateRecipes(user.id),
        ]);
      } catch (err) {
        console.error('Error in fetchUser:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    // Listen for authentication state changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Refresh recipes when user logs in
        Promise.all([
          fetchFavoriteRecipes(session.user.id),
          fetchPublicRecipes(session.user.id),
          fetchPrivateRecipes(session.user.id),
        ]).catch((err) => {
          console.error('Error refreshing recipes:', err);
        });
      } else {
        // Redirect to login when user logs out
        router.push('/login');
      }
    });

    // Cleanup: unsubscribe from auth state changes
    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  /**
   * Fetch all recipes that the user has favorited
   */
  const fetchFavoriteRecipes = async (userId: string) => {
    try {
      const { data: savedData, error: savedError } = await supabaseClient
        .from('saved_recipes')
        .select('recipe_id')
        .eq('user_id', userId);

      if (savedError) {
        console.error('Error fetching saved recipes:', savedError);
        setError('Failed to load favorites');
        return;
      }

      if (!savedData || savedData.length === 0) {
        setFavoriteRecipes([]);
        return;
      }

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
          is_public,
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

  /**
   * Fetch all public recipes created by the user
   */
  const fetchPublicRecipes = async (userId: string) => {
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
          is_public,
          profiles:user_id (
            username
          )
        `)
        .eq('user_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching public recipes:', error);
        setError('Failed to load your public recipes');
        return;
      }

      const recipes = (data || []) as unknown as Recipe[];
      const normalizedRecipes = recipes
        .map((recipe: Recipe) => normalizeRecipe(recipe))
        .filter((recipe): recipe is NormalizedRecipe => recipe !== null);
      
      setPublicRecipes(normalizedRecipes);
    } catch (err) {
      console.error('Unexpected error fetching public recipes:', err);
      setError('An unexpected error occurred while loading recipes');
    }
  };

  /**
   * Fetch all private recipes created by the user
   */
  const fetchPrivateRecipes = async (userId: string) => {
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
          is_public,
          profiles:user_id (
            username
          )
        `)
        .eq('user_id', userId)
        .eq('is_public', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching private recipes:', error);
        setError('Failed to load your private recipes');
        return;
      }

      const recipes = (data || []) as unknown as Recipe[];
      const normalizedRecipes = recipes
        .map((recipe: Recipe) => normalizeRecipe(recipe))
        .filter((recipe): recipe is NormalizedRecipe => recipe !== null);
      
      setPrivateRecipes(normalizedRecipes);
    } catch (err) {
      console.error('Unexpected error fetching private recipes:', err);
      setError('An unexpected error occurred while loading recipes');
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

  // Not logged in: should have been redirected, but show message just in case
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
                  fetchFavoriteRecipes(user.id),
                  fetchPublicRecipes(user.id),
                  fetchPrivateRecipes(user.id),
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

  const currentRecipes = 
    filter === 'favorites' ? favoriteRecipes :
    filter === 'public' ? publicRecipes :
    privateRecipes;

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
          className={`tab ${filter === 'favorites' ? 'tab-active' : ''}`}
          onClick={() => setFilter('favorites')}
        >
          Favorites ({favoriteRecipes.length})
        </button>
        <button
          className={`tab ${filter === 'public' ? 'tab-active' : ''}`}
          onClick={() => setFilter('public')}
        >
          Public Recipes ({publicRecipes.length})
        </button>
        <button
          className={`tab ${filter === 'private' ? 'tab-active' : ''}`}
          onClick={() => setFilter('private')}
        >
          Private Recipes ({privateRecipes.length})
        </button>
      </div>

      {/* Recipe List */}
      {currentRecipes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg opacity-70 mb-4">
            {filter === 'favorites' 
              ? "You haven't favorited any recipes yet." 
              : filter === 'public'
              ? "You haven't created any public recipes yet."
              : "You haven't created any private recipes yet."}
          </p>
          {(filter === 'public' || filter === 'private') && (
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
