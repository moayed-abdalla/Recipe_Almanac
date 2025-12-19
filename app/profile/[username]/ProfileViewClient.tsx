/**
 * Profile View Client Component
 * 
 * Client-side interactive parts of the profile view:
 * - Tab navigation
 * - Favorites tab (shows viewer's favorites)
 * - Statistics display
 */

'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/useAuth';
import { fetchPublicRecipes, fetchFavoriteRecipes } from '@/lib/recipeService';
import type { NormalizedRecipe, Profile, UserStats } from '@/types';
import ProfileHeader from '@/components/profile/ProfileHeader';
import Tabs from '@/components/navigation/Tabs';
import RecipeGrid from '@/components/recipe/RecipeGrid';
import EmptyState from '@/components/ui/EmptyState';

interface ProfileViewClientProps {
  profile: Profile;
  initialPublicRecipes: NormalizedRecipe[];
  initialStats: UserStats;
}

export default function ProfileViewClient({
  profile,
  initialPublicRecipes,
  initialStats,
}: ProfileViewClientProps) {
  const { user } = useAuth({ requireAuth: false });
  
  // Active tab: 'favorites' or 'recipes'
  const [activeTab, setActiveTab] = useState<'favorites' | 'recipes'>('recipes');
  
  // Owner's public recipes
  const [publicRecipes, setPublicRecipes] = useState<NormalizedRecipe[]>(initialPublicRecipes);
  
  // User's favorited recipes (viewer's favorites)
  const [favoriteRecipes, setFavoriteRecipes] = useState<NormalizedRecipe[]>([]);
  
  // Statistics
  const [stats, setStats] = useState<UserStats>(initialStats);
  
  // Loading state for favorites
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  /**
   * Load viewer's favorites when user is logged in
   */
  useEffect(() => {
    const loadFavorites = async () => {
      if (user) {
        setLoadingFavorites(true);
        try {
          const favoriteRecs = await fetchFavoriteRecipes(user.id);
          setFavoriteRecipes(favoriteRecs);
        } catch (err) {
          console.error('Error loading favorites:', err);
        } finally {
          setLoadingFavorites(false);
        }
      } else {
        setFavoriteRecipes([]);
      }
    };

    loadFavorites();
  }, [user]);

  const currentRecipes = activeTab === 'recipes' ? publicRecipes : favoriteRecipes;

  const tabs = [
    { 
      id: 'recipes', 
      label: `${profile.username}'s Recipes`, 
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
    <div className="max-w-4xl mx-auto">
      {/* Profile Header */}
      <ProfileHeader 
        profile={profile} 
        stats={stats}
      />

      {/* Tabs */}
      <Tabs 
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as 'favorites' | 'recipes')}
      />

      {/* Recipe List */}
      {loadingFavorites && activeTab === 'favorites' ? (
        <div className="text-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : currentRecipes.length === 0 ? (
        <EmptyState
          message={
            activeTab === 'recipes'
              ? `${profile.username} hasn't created any public recipes yet.`
              : !user
              ? "Please log in to view your favorites."
              : "You haven't favorited any recipes yet."
          }
        />
      ) : (
        <RecipeGrid recipes={currentRecipes} />
      )}
    </div>
  );
}
