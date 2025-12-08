/**
 * My Profile Page Component
 * 
 * Displays the authenticated user's own profile with:
 * - Profile picture with upload/change functionality
 * - Username and profile description
 * - Statistics: total views on recipes, total favorites received
 * - List of favorited recipes
 * 
 * This is a Client Component because it needs to:
 * - Access user authentication state
 * - Handle profile picture uploads
 * - Fetch user-specific data from Supabase
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
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
  totalFavoritesReceived: number;
}

export default function MyProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoriteRecipes, setFavoriteRecipes] = useState<NormalizedRecipe[]>([]);
  const [stats, setStats] = useState<UserStats>({ totalViews: 0, totalFavoritesReceived: 0 });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Normalize recipe data from Supabase
   * Converts profiles from array to single object if needed
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
      // Get all user's recipes
      const { data: recipes, error: recipesError } = await supabaseClient
        .from('recipes')
        .select('id, view_count')
        .eq('user_id', userId);

      if (recipesError) {
        console.error('Error fetching recipes for stats:', recipesError);
        return;
      }

      const recipeIds = (recipes || []).map((r: { id: string }) => r.id);
      const totalViews = (recipes || []).reduce((sum: number, r: { view_count: number }) => sum + r.view_count, 0);

      // Get total favorites received (count saved_recipes where recipe_id is in user's recipes)
      let totalFavoritesReceived = 0;
      if (recipeIds.length > 0) {
        const { count, error: favoritesError } = await supabaseClient
          .from('saved_recipes')
          .select('*', { count: 'exact', head: true })
          .in('recipe_id', recipeIds);

        if (!favoritesError && count !== null) {
          totalFavoritesReceived = count;
        }
      }

      setStats({
        totalViews,
        totalFavoritesReceived,
      });
    } catch (err) {
      console.error('Unexpected error fetching stats:', err);
    }
  };

  /**
   * Handle profile picture upload
   */
  const handleAvatarUpload = async (file: File) => {
    if (!user || !profile) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      // Use consistent filename for upsert to work properly
      const fileName = `${user.id}/avatar.${fileExt}`;
      
      // Delete old avatar files for this user (non-blocking cleanup)
      // This helps clean up old files if extension changed
      try {
        const { data: oldFiles } = await supabaseClient.storage
          .from('avatars')
          .list(user.id);
        
        if (oldFiles) {
          const avatarFiles = oldFiles.filter(f => f.name.startsWith('avatar.'));
          if (avatarFiles.length > 0) {
            const filesToDelete = avatarFiles
              .filter(f => f.name !== `avatar.${fileExt}`)
              .map(f => `${user.id}/${f.name}`);
            if (filesToDelete.length > 0) {
              await supabaseClient.storage
                .from('avatars')
                .remove(filesToDelete);
            }
          }
        }
      } catch (cleanupError) {
        // Non-blocking: if cleanup fails, continue with upload
        console.warn('Failed to cleanup old avatar files:', cleanupError);
      }
      
      // Upload to avatars bucket
      const { error: uploadError } = await supabaseClient.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true, // Replace existing file if it exists
        });

      if (uploadError) {
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabaseClient.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }

      // Update local state
      setProfile({ ...profile, avatar_url: publicUrl });
      setAvatarPreview(null);
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      alert(`Failed to upload avatar: ${err.message}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  /**
   * Handle file input change
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Preview image
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Upload the file
      handleAvatarUpload(file);
    }
  };

  /**
   * Initialize: Check auth and fetch data
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session?.user) {
          router.push('/login');
          return;
        }

        setUser(session.user);
        
        // Fetch profile
        const userProfile = await fetchProfile(session.user.id);
        if (!userProfile) {
          router.push('/login');
          return;
        }

        setProfile(userProfile);
        
        // Fetch favorites and stats in parallel
        await Promise.all([
          fetchFavoriteRecipes(session.user.id),
          fetchStats(session.user.id),
        ]);
      } catch (err) {
        console.error('Error initializing profile page:', err);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const displayAvatarUrl = avatarPreview || profile.avatar_url;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="card bg-base-200 shadow-xl mb-8">
          <div className="card-body">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar with upload */}
              <div className="relative">
                <div className="avatar">
                  <div className="w-32 rounded-full bg-base-300 ring ring-primary ring-offset-base-100 ring-offset-2">
                    {displayAvatarUrl ? (
                      <Image
                        src={displayAvatarUrl}
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
                {/* Upload button overlay */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 btn btn-circle btn-primary btn-sm"
                  title="Change profile picture"
                >
                  {uploadingAvatar ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-4xl font-bold mb-2">{profile.username}</h1>
                {profile.profile_description && (
                  <p className="text-lg opacity-80 mb-4">{profile.profile_description}</p>
                )}
                
                {/* Statistics */}
                <div className="stats stats-vertical md:stats-horizontal shadow mt-4">
                  <div className="stat">
                    <div className="stat-title">Total Views</div>
                    <div className="stat-value text-primary">{stats.totalViews.toLocaleString()}</div>
                    <div className="stat-desc">On your recipes</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Favorites Received</div>
                    <div className="stat-value text-secondary">{stats.totalFavoritesReceived.toLocaleString()}</div>
                    <div className="stat-desc">People favorited your recipes</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Favorited Recipes */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">My Favorited Recipes</h2>
          {favoriteRecipes.length === 0 ? (
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body text-center py-12">
                <p className="text-lg opacity-60">You haven't favorited any recipes yet.</p>
                <p className="text-sm opacity-50 mt-2">Start exploring and save your favorite recipes!</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteRecipes.map((recipe) => (
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
    </div>
  );
}
