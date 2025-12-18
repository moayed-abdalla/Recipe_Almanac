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
import Link from 'next/link';
import Image from 'next/image';
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

interface Profile {
  id: string;
  username: string;
  profile_description: string | null;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  
  // Current authenticated user
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  
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
        
        // Fetch profile
        const userProfile = await fetchProfile(user.id);
        if (!userProfile) {
          router.push('/login');
          return;
        }
        
        setProfile(userProfile);
        
        // Fetch all recipes
        await Promise.all([
          fetchPublicRecipes(user.id),
          fetchFavoriteRecipes(user.id),
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
        // Refresh data when user logs in
        fetchProfile(session.user.id).then((profile) => {
          if (profile) {
            setProfile(profile);
            Promise.all([
              fetchPublicRecipes(session.user.id),
              fetchFavoriteRecipes(session.user.id),
            ]).catch((err) => {
              console.error('Error refreshing recipes:', err);
            });
          }
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
  if (!user || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-warning">
          <span>Please log in to view your profile</span>
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
                  fetchPublicRecipes(user.id),
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

  const currentRecipes = activeTab === 'public' ? publicRecipes : favoriteRecipes;

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
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.username}
                      width={128}
                      height={128}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-base-300 flex items-center justify-center">
                      <span className="text-4xl font-bold">
                        {profile.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
                  <h1 className="text-4xl font-bold">{profile.username}</h1>
                  <Link href="/profile/edit" className="btn btn-primary">
                    Edit Profile
                  </Link>
                </div>
                {profile.profile_description && (
                  <p className="text-lg opacity-80 mb-4">{profile.profile_description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-6">
          <button
            className={`tab ${activeTab === 'public' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('public')}
          >
            Public Recipes ({publicRecipes.length})
          </button>
          <button
            className={`tab ${activeTab === 'favorites' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            Favorites ({favoriteRecipes.length})
          </button>
        </div>

        {/* Recipe List */}
        {currentRecipes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg opacity-70 mb-4">
              {activeTab === 'public'
                ? "You haven't created any public recipes yet."
                : "You haven't favorited any recipes yet."}
            </p>
            {activeTab === 'public' && (
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
    </div>
  );
}
