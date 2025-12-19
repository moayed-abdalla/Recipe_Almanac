/**
 * Profile Page Component
 * 
 * Displays the authenticated user's profile:
 * - Profile image
 * - Description
 * - Public recipes
 * - Favorite recipes
 * - Edit profile button (only visible when viewing own profile)
 * 
 * This is a Client Component because it needs to:
 * - Access user authentication state
 * - Handle user interactions
 * - Fetch user-specific data from Supabase
 */

'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/useAuth';
import { fetchPublicRecipes, fetchFavoriteRecipes } from '@/lib/recipeService';
import type { NormalizedRecipe, Profile } from '@/types';
import ProfileHeader from '@/components/profile/ProfileHeader';
import Tabs from '@/components/navigation/Tabs';
import RecipeGrid from '@/components/recipe/RecipeGrid';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorAlert from '@/components/ui/ErrorAlert';
import EmptyState from '@/components/ui/EmptyState';

export default function ProfilePage() {
  const { user, loading: authLoading, error: authError } = useAuth({ requireAuth: true });
  
  // User's profile data
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // Active tab: 'public' or 'favorites'
  const [activeTab, setActiveTab] = useState<'public' | 'favorites'>('public');
  
  // User's public recipes
  const [publicRecipes, setPublicRecipes] = useState<NormalizedRecipe[]>([]);
  
  // User's favorited recipes
  const [favoriteRecipes, setFavoriteRecipes] = useState<NormalizedRecipe[]>([]);
  
  // Loading state for initial data fetch
  const [loading, setLoading] = useState(true);
  
  // Error state for displaying error messages
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch user profile data
   */
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as Profile;
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      return null;
    }
  };

  /**
   * Load profile and recipes
   */
  const loadData = async () => {
    if (!user) return;
    
    try {
      setError(null);
      setLoading(true);
      
      const userProfile = await fetchProfile(user.id);
      if (!userProfile) {
        setError('Failed to load profile');
        return;
      }
      
      setProfile(userProfile);
      
      // Fetch all recipes
      const [publicRecs, favoriteRecs] = await Promise.all([
        fetchPublicRecipes(user.id),
        fetchFavoriteRecipes(user.id),
      ]);
      
      setPublicRecipes(publicRecs);
      setFavoriteRecipes(favoriteRecs);
    } catch (err) {
      console.error('Error loading profile data:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch user data and recipes on component mount
   */
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Loading state: show spinner while fetching data
  if (authLoading || loading) {
    return <LoadingSpinner message="Loading your profile..." />;
  }

  // Not logged in: should have been redirected, but show message just in case
  if (!user || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-warning">
          <span>Please log in to view your profile</span>
        </div>
      </div>
    );
  }

  // Error state: show error message if something went wrong
  if (authError || error) {
    return (
      <ErrorAlert 
        message={authError || error || 'An unexpected error occurred'} 
        onRetry={loadData}
      />
    );
  }

  const currentRecipes = activeTab === 'public' ? publicRecipes : favoriteRecipes;

  const tabs = [
    { id: 'public', label: 'Public Recipes', count: publicRecipes.length },
    { id: 'favorites', label: 'Favorites', count: favoriteRecipes.length },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <ProfileHeader profile={profile} showEditButton={true} />

        {/* Tabs */}
        <Tabs 
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as 'public' | 'favorites')}
        />

        {/* Recipe List */}
        {currentRecipes.length === 0 ? (
          <EmptyState
            message={
              activeTab === 'public'
                ? "You haven't created any public recipes yet."
                : "You haven't favorited any recipes yet."
            }
            action={
              activeTab === 'public'
                ? { label: 'Create Your First Recipe', href: '/recipe/create' }
                : undefined
            }
          />
        ) : (
          <RecipeGrid recipes={currentRecipes} />
        )}
      </div>
    </div>
  );
}
