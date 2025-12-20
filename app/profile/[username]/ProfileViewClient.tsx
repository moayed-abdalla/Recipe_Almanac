/**
 * Profile View Client Component
 * 
 * Client-side interactive parts of the profile view:
 * - Tab navigation
 * - Favorites tab (shows profile owner's favorites)
 * - Statistics display
 */

'use client';

import { useState } from 'react';
import type { NormalizedRecipe, Profile, UserStats } from '@/types';
import ProfileHeader from '@/components/profile/ProfileHeader';
import Tabs from '@/components/navigation/Tabs';
import RecipeGrid from '@/components/recipe/RecipeGrid';
import EmptyState from '@/components/ui/EmptyState';

interface ProfileViewClientProps {
  profile: Profile;
  initialPublicRecipes: NormalizedRecipe[];
  initialFavoriteRecipes: NormalizedRecipe[];
  initialStats: UserStats;
}

export default function ProfileViewClient({
  profile,
  initialPublicRecipes,
  initialFavoriteRecipes,
  initialStats,
}: ProfileViewClientProps) {
  // Active tab: 'favorites' or 'recipes'
  const [activeTab, setActiveTab] = useState<'favorites' | 'recipes'>('recipes');
  
  // Owner's public recipes
  const [publicRecipes] = useState<NormalizedRecipe[]>(initialPublicRecipes);
  
  // Profile owner's favorited recipes (public recipes only)
  const [favoriteRecipes] = useState<NormalizedRecipe[]>(initialFavoriteRecipes);
  
  // Statistics
  const [stats] = useState<UserStats>(initialStats);

  const currentRecipes = activeTab === 'recipes' ? publicRecipes : favoriteRecipes;

  const tabs = [
    { 
      id: 'recipes', 
      label: `${profile.username}'s Recipes`, 
      count: publicRecipes.length 
    },
    { 
      id: 'favorites', 
      label: `${profile.username}'s Favorites`, 
      count: favoriteRecipes.length
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
      {currentRecipes.length === 0 ? (
        <EmptyState
          message={
            activeTab === 'recipes'
              ? `${profile.username} hasn't created any public recipes yet.`
              : `${profile.username} hasn't favorited any public recipes yet.`
          }
        />
      ) : (
        <RecipeGrid recipes={currentRecipes} />
      )}
    </div>
  );
}
