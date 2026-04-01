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

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfileContext } from '@/contexts/ProfileContext';
import { fetchPublicRecipes, fetchFavoriteRecipes } from '@/lib/recipeService';
import { profileMark, profileMeasure } from '@/lib/profile-performance';
import type { NormalizedRecipe } from '@/types';
import ProfileHeader from '@/components/profile/ProfileHeader';
import Tabs from '@/components/navigation/Tabs';
import RecipeGrid from '@/components/recipe/RecipeGrid';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorAlert from '@/components/ui/ErrorAlert';
import EmptyState from '@/components/ui/EmptyState';

export default function ProfilePage() {
  const { user, loading: authLoading, error: authError, refetch: refetchAuth } = useAuth({
    requireAuth: true,
  });
  const { profile, loading: profileLoading, refreshProfile } = useProfileContext();

  const [activeTab, setActiveTab] = useState<'public' | 'favorites'>('public');

  const [publicRecipes, setPublicRecipes] = useState<NormalizedRecipe[]>([]);

  const [favoriteRecipes, setFavoriteRecipes] = useState<NormalizedRecipe[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const loadRecipes = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      setLoading(true);
      profileMark('profileRecipesFetchStart');
      const [publicRecs, favoriteRecs] = await Promise.all([
        fetchPublicRecipes(user.id),
        fetchFavoriteRecipes(user.id),
      ]);
      profileMark('profileRecipesFetchEnd');
      profileMeasure('recipesParallel', 'profileRecipesFetchStart', 'profileRecipesFetchEnd');
      setPublicRecipes(publicRecs);
      setFavoriteRecipes(favoriteRecs);
    } catch (err) {
      console.error('Error loading profile data:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || profileLoading) return;

    if (!profile) {
      setError('Failed to load profile');
      setLoading(false);
      return;
    }

    void loadRecipes();
  }, [user, profile, profileLoading, loadRecipes]);

  if (authLoading || profileLoading || loading) {
    return <LoadingSpinner message="Loading your profile..." />;
  }

  if (authError) {
    return (
      <ErrorAlert
        message={authError}
        onRetry={() => {
          void refetchAuth();
        }}
      />
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-warning">
          <span>Please log in to view your profile</span>
        </div>
      </div>
    );
  }

  if (!profile || error) {
    return (
      <ErrorAlert
        message={error || 'Failed to load profile'}
        onRetry={async () => {
          setError(null);
          await refreshProfile();
          await loadRecipes();
        }}
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
        <ProfileHeader profile={profile} showEditButton={true} />

        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as 'public' | 'favorites')}
        />

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
