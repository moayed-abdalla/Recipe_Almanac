'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { 
  fetchFavoriteRecipes, 
  fetchPublicRecipes, 
  fetchPrivateRecipes 
} from '@/lib/recipeService';
import type { NormalizedRecipe } from '@/types';
import Tabs from '@/components/navigation/Tabs';
import RecipeGrid from '@/components/recipe/RecipeGrid';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorAlert from '@/components/ui/ErrorAlert';
import EmptyState from '@/components/ui/EmptyState';

export default function AlmanacPage() {
  const { user, loading: authLoading, error: authError } = useAuth({ requireAuth: true });
  
  // Active filter tab: 'favorites', 'public', or 'private'
  const [filter, setFilter] = useState<'favorites' | 'public' | 'private'>('favorites');
  
  // User's favorited recipes
  const [favoriteRecipes, setFavoriteRecipes] = useState<NormalizedRecipe[]>([]);
  
  // User's public recipes
  const [publicRecipes, setPublicRecipes] = useState<NormalizedRecipe[]>([]);
  
  // User's private recipes
  const [privateRecipes, setPrivateRecipes] = useState<NormalizedRecipe[]>([]);
  
  // Loading state for recipes
  const [loading, setLoading] = useState(true);
  
  // Error state for displaying error messages
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all recipes for the user
   */
  const loadRecipes = async () => {
    if (!user) return;
    
    try {
      setError(null);
      setLoading(true);
      
      const [favorites, publicRecs, privateRecs] = await Promise.all([
        fetchFavoriteRecipes(user.id),
        fetchPublicRecipes(user.id),
        fetchPrivateRecipes(user.id),
      ]);
      
      setFavoriteRecipes(favorites);
      setPublicRecipes(publicRecs);
      setPrivateRecipes(privateRecs);
    } catch (err) {
      console.error('Error loading recipes:', err);
      setError('Failed to load recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadRecipes();
    }
  }, [user]);

  // Loading state: show spinner while fetching data
  if (authLoading || loading) {
    return <LoadingSpinner message="Loading your almanac..." />;
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
  if (authError || error) {
    return (
      <ErrorAlert 
        message={authError || error || 'An unexpected error occurred'} 
        onRetry={loadRecipes}
      />
    );
  }

  const currentRecipes = 
    filter === 'favorites' ? favoriteRecipes :
    filter === 'public' ? publicRecipes :
    privateRecipes;

  const tabs = [
    { id: 'favorites', label: 'Favorites', count: favoriteRecipes.length },
    { id: 'public', label: 'Public Recipes', count: publicRecipes.length },
    { id: 'private', label: 'Private Recipes', count: privateRecipes.length },
  ];

  const emptyMessages = {
    favorites: "You haven't favorited any recipes yet.",
    public: "You haven't created any public recipes yet.",
    private: "You haven't created any private recipes yet.",
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold leading-none flex items-center">My Almanac</h1>
        <Link href="/recipe/create" className="btn btn-primary">
          + Add Recipe
        </Link>
      </div>
      
      {/* Filter Tabs */}
      <Tabs 
        tabs={tabs}
        activeTab={filter}
        onTabChange={(tabId) => setFilter(tabId as 'favorites' | 'public' | 'private')}
      />

      {/* Recipe List */}
      {currentRecipes.length === 0 ? (
        <EmptyState
          message={emptyMessages[filter]}
          action={
            (filter === 'public' || filter === 'private')
              ? { label: 'Create Your First Recipe', href: '/recipe/create' }
              : undefined
          }
        />
      ) : (
        <RecipeGrid recipes={currentRecipes} />
      )}
    </div>
  );
}
