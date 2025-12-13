/**
 * User Profile + Almanac Page Component
 * 
 * Displays a user's public profile and almanac:
 * - Profile picture
 * - Username and description
 * - Statistics: total views on recipes, number of favorited recipes
 * - Favorite recipes (recipes the user has favorited)
 * - Public recipes (recipes created by the user)
 * 
 * This is a Client Component because it needs to:
 * - Access user authentication state (to show viewer's favorites)
 * - Handle tab switching
 * - Fetch user-specific data from Supabase
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import type { Session } from '@supabase/supabase-js';
import RecipeCard from '@/components/RecipeCard';
import Image from 'next/image';

interface Profile {
  id: string;
  username: string;
  profile_description: string | null;
  avatar_url: string | null;
}

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

interface UserStats {
  totalViews: number;
  favoritedRecipesCount: number;
}

export default function UserProfileAlmanacPage() {
  const params = useParams();
  const username = params?.username as string;
  
  // Current authenticated user
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  
  // Profile owner's data
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null);
  
  // Check if current user is viewing their own profile
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  
  // Active tab: 'favorites' or 'recipes'
  const [activeTab, setActiveTab] = useState<'favorites' | 'recipes'>('recipes');
  
  // Owner's public recipes
  const [publicRecipes, setPublicRecipes] = useState<NormalizedRecipe[]>([]);
  
  // User's favorited recipes (viewer's favorites if viewing someone else, owner's favorites if viewing own)
  const [favoriteRecipes, setFavoriteRecipes] = useState<NormalizedRecipe[]>([]);
  
  // Statistics
  const [stats, setStats] = useState<UserStats>({ totalViews: 0, favoritedRecipesCount: 0 });
  
  // Loading state
  const [loading, setLoading] = useState(true);
  
  // Error state
  const [error, setError] = useState<string | null>(null);

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
      profiles,
    };
  };

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
   * Fetch owner's public recipes
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
          profiles:user_id (
            username
          )
        `)
        .eq('user_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching public recipes:', error);
        return;
      }

      const recipes = (data || []) as unknown as Recipe[];
      const normalizedRecipes = recipes
        .map((recipe: Recipe) => normalizeRecipe(recipe))
        .filter((recipe): recipe is NormalizedRecipe => recipe !== null);
      
      setPublicRecipes(normalizedRecipes);
    } catch (err) {
      console.error('Unexpected error fetching public recipes:', err);
    }
  };

  /**
   * Fetch user's favorited recipes
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
        return;
      }

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
        return;
      }

      const recipes = (data || []) as unknown as Recipe[];
      const normalizedRecipes = recipes
        .map((recipe: Recipe) => normalizeRecipe(recipe))
        .filter((recipe): recipe is NormalizedRecipe => recipe !== null);
      
      setFavoriteRecipes(normalizedRecipes);
    } catch (err) {
      console.error('Unexpected error fetching favorite recipes:', err);
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
   * Initialize: Fetch all data
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        
        // Fetch current authenticated user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        
        if (userError) {
          console.error('Error fetching user:', userError);
          // Don't set error - user might not be logged in
        }
        
        setUser(user);
        
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
        await Promise.all([
          fetchPublicRecipes(profile.id),
          fetchStats(profile.id),
        ]);
        
        // Fetch favorites - always show viewer's favorites (current logged-in user's favorites)
        // If not logged in, favorites will be empty
        if (user) {
          await fetchFavoriteRecipes(user.id);
        }
      } catch (err) {
        console.error('Error in fetchData:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Listen for authentication state changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (_event: string, session: Session | null) => {
      setUser(session?.user ?? null);
      
      if (ownerProfile) {
        const ownProfile = session?.user?.id === ownerProfile.id;
        setIsOwnProfile(ownProfile);
        
        // Refresh favorites when user logs in/out
        if (session?.user) {
          await fetchFavoriteRecipes(session.user.id).catch((err) => {
            console.error('Error refreshing favorites:', err);
          });
        } else {
          setFavoriteRecipes([]);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [username]);

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !ownerProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>{error || 'User not found'}</span>
        </div>
        <div className="text-center mt-4">
          <a href="/" className="btn btn-primary">
            Go Home
          </a>
        </div>
      </div>
    );
  }

  const currentRecipes = activeTab === 'recipes' ? publicRecipes : favoriteRecipes;
  const tabLabel = activeTab === 'recipes' 
    ? `${ownerProfile.username}'s Recipes` 
    : (isOwnProfile ? 'My Favorites' : 'My Favorites');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="card bg-base-200 shadow-xl mb-8">
          <div className="card-body">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div className="avatar">
                <div className="w-32 rounded-full bg-base-300">
                  {ownerProfile.avatar_url ? (
                    <Image
                      src={ownerProfile.avatar_url}
                      alt={ownerProfile.username}
                      width={128}
                      height={128}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-base-300 flex items-center justify-center">
                      <span className="text-4xl font-bold">
                        {ownerProfile.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-4xl font-bold mb-2">{ownerProfile.username}</h1>
                {ownerProfile.profile_description && (
                  <p className="text-lg opacity-80 mb-4">{ownerProfile.profile_description}</p>
                )}
                
                {/* Statistics */}
                <div className="stats stats-vertical md:stats-horizontal shadow mt-4">
                  <div className="stat">
                    <div className="stat-title">Total Views</div>
                    <div className="stat-value text-primary">{stats.totalViews.toLocaleString()}</div>
                    <div className="stat-desc">On recipes</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Favorited Recipes</div>
                    <div className="stat-value text-secondary">{stats.favoritedRecipesCount.toLocaleString()}</div>
                    <div className="stat-desc">Recipes favorited</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-6">
          <button
            className={`tab ${activeTab === 'recipes' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('recipes')}
          >
            {ownerProfile.username}'s Recipes ({publicRecipes.length})
          </button>
          <button
            className={`tab ${activeTab === 'favorites' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('favorites')}
            disabled={!user}
            title={!user ? 'Log in to view your favorites' : ''}
          >
            My Favorites ({favoriteRecipes.length})
          </button>
        </div>

        {/* Recipe List */}
        {currentRecipes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg opacity-70 mb-4">
              {activeTab === 'recipes'
                ? `${ownerProfile.username} hasn't created any public recipes yet.`
                : !user
                ? "Please log in to view your favorites."
                : "You haven't favorited any recipes yet."}
            </p>
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
    </div>
  );
}
