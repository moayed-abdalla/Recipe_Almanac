'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/useAuth';
import { fetchPublicRecipes, fetchFavoriteRecipes } from '@/lib/recipeService';
import type { NormalizedRecipe, Profile, UserStats } from '@/types';
import ProfileHeader from '@/components/profile/ProfileHeader';
import Tabs from '@/components/navigation/Tabs';
import RecipeGrid from '@/components/recipe/RecipeGrid';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorAlert from '@/components/ui/ErrorAlert';
import EmptyState from '@/components/ui/EmptyState';

export default function UserPage() {
  const params = useParams();
  const username = params?.username as string;
  const { user } = useAuth({ requireAuth: false });
  
  // Profile owner's data
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null);
  
  // Check if current user is viewing their own profile
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  
  // Active tab: 'favorites' or 'recipes'
  const [activeTab, setActiveTab] = useState<'favorites' | 'recipes'>('recipes');
  
  // Owner's public recipes
  const [publicRecipes, setPublicRecipes] = useState<NormalizedRecipe[]>([]);
  
  // User's favorited recipes (viewer's favorites)
  const [favoriteRecipes, setFavoriteRecipes] = useState<NormalizedRecipe[]>([]);
  
  // Statistics
  const [stats, setStats] = useState<UserStats>({ totalViews: 0, favoritedRecipesCount: 0 });
  
  // Loading state
  const [loading, setLoading] = useState(true);
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch owner profile by username
   */
  const fetchOwnerProfile = async (usernameParam: string) => {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('username', usernameParam)
        .single();

      if (error || !data) {
        console.error('Error fetching profile:', error);
        setError('User not found');
        return null;
      }

      return data as Profile;
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setError('An unexpected error occurred');
      return null;
    }
  };


  /**
   * Fetch user statistics
   */
  const fetchStats = async (userId: string) => {
    try {
      // Get all user's recipes (for total views)
      const { data: recipes, error: recipesError } = await supabaseClient
        .from('recipes')
        .select('id, view_count')
        .eq('user_id', userId);

      if (recipesError) {
        console.error('Error fetching recipes for stats:', recipesError);
        return;
      }

      const totalViews = (recipes || []).reduce((sum: number, r: { view_count: number }) => sum + r.view_count, 0);

      // Get number of recipes the user has favorited
      const { count, error: favoritesError } = await supabaseClient
        .from('saved_recipes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const favoritedRecipesCount = favoritesError || count === null ? 0 : count;

      setStats({
        totalViews,
        favoritedRecipesCount,
      });
    } catch (err) {
      console.error('Unexpected error fetching stats:', err);
    }
  };

  /**
   * Load profile and recipes
   */
  const loadData = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Fetch owner profile
      const profile = await fetchOwnerProfile(username);
      if (!profile) {
        setLoading(false);
        return;
      }
      
      setOwnerProfile(profile);
      
      // Check if current user is viewing their own profile
      const ownProfile = user?.id === profile.id;
      setIsOwnProfile(ownProfile);
      
      // Fetch public recipes and stats
      const [publicRecs] = await Promise.all([
        fetchPublicRecipes(profile.id),
        fetchStats(profile.id),
      ]);
      
      setPublicRecipes(publicRecs);
      
      // Fetch favorites - always show viewer's favorites (current logged-in user's favorites)
      // If not logged in, favorites will be empty
      if (user) {
        const favoriteRecs = await fetchFavoriteRecipes(user.id);
        setFavoriteRecipes(favoriteRecs);
      } else {
        setFavoriteRecipes([]);
      }
    } catch (err) {
      console.error('Error loading profile data:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Initialize: Fetch all data
   */
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, user]);

  // Loading state
  if (loading) {
    return <LoadingSpinner message="Loading profile..." />;
  }

  // Error state
  if (error || !ownerProfile) {
    return (
      <ErrorAlert 
        message={error || 'User not found'} 
        actionText="Go Home"
        onRetry={() => window.location.href = '/'}
      />
    );
  }

  const currentRecipes = activeTab === 'recipes' ? publicRecipes : favoriteRecipes;

  const tabs = [
    { 
      id: 'recipes', 
      label: `${ownerProfile.username}'s Recipes`, 
      count: publicRecipes.length 
    },
    { 
      id: 'favorites', 
      label: 'My Favorites', 
      count: favoriteRecipes.length,
      disabled: !user,
      title: !user ? 'Log in to view your favorites' : undefined
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <ProfileHeader 
          profile={ownerProfile} 
          stats={stats}
        />

        {/* Tabs */}
        <Tabs 
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as 'favorites' | 'recipes')}
        />

        {/* Recipe List */}
        {currentRecipes.length === 0 ? (
          <EmptyState
            message={
              activeTab === 'recipes'
                ? `${ownerProfile.username} hasn't created any public recipes yet.`
                : !user
                ? "Please log in to view your favorites."
                : "You haven't favorited any recipes yet."
            }
          />
        ) : (
          <RecipeGrid recipes={currentRecipes} />
        )}
      </div>
    </div>
  );
}

