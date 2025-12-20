import { createServerClient } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { normalizeRecipes } from '@/utils/recipeNormalizer';
import type { Profile, RecipeWithProfile, UserStats, NormalizedRecipe } from '@/types';
import ProfileViewClient from './ProfileViewClient';

interface ProfilePageProps {
  params: {
    username: string;
  };
}

// Force dynamic rendering since this page depends on user-specific data
export const dynamic = 'force-dynamic';

export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = await createServerClient();

  // Decode username from URL (handles URL-encoded spaces like "Uncle%20Mo" -> "Uncle Mo")
  const decodedUsername = decodeURIComponent(params.username);

  // Step 1: Fetch user profile by username
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', decodedUsername)
    .single();

  // If profile not found, show 404 page
  if (profileError || !profile) {
    console.error('Profile fetch error:', profileError);
    notFound();
  }

  // Type assertion to help TypeScript understand the data structure
  const typedProfile = profile as Profile;

  // Step 2: Fetch user's public recipes with profile data
  const { data: recipes, error: recipesError } = await supabase
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
    .eq('user_id', typedProfile.id)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  // Handle errors gracefully
  if (recipesError) {
    console.error('Error fetching recipes:', recipesError);
  }

  // Normalize recipes
  const normalizedRecipes = normalizeRecipes((recipes || []) as RecipeWithProfile[]);

  // Step 3: Fetch profile owner's favorited recipes (only public ones for public profile view)
  // Use RPC function to bypass RLS when viewing someone else's profile while not logged in
  let normalizedFavoriteRecipes: NormalizedRecipe[] = [];
  
  // Define the RPC result type
  type RPCFavoriteRecipe = {
    id: string;
    slug: string;
    title: string;
    image_url: string | null;
    description: string | null;
    view_count: number;
    tags: string[];
    is_public: boolean;
    created_at: string;
    updated_at: string;
    user_id: string;
    creator_username: string;
  };
  
  // Try using the RPC function first (works for both authenticated and anonymous users)
  const { data: rpcFavoriteRecipes, error: rpcError } = await (supabase
    .rpc as any)('get_public_favorited_recipes', { target_user_id: typedProfile.id }) as {
    data: RPCFavoriteRecipe[] | null;
    error: any;
  };

  if (!rpcError && rpcFavoriteRecipes && rpcFavoriteRecipes.length > 0) {
    // Map the RPC result to match the expected RecipeWithProfile format
    const recipesWithProfiles = rpcFavoriteRecipes.map((recipe: RPCFavoriteRecipe) => ({
      id: recipe.id,
      slug: recipe.slug,
      title: recipe.title,
      image_url: recipe.image_url,
      description: recipe.description,
      view_count: recipe.view_count,
      tags: recipe.tags,
      is_public: recipe.is_public,
      profiles: {
        username: recipe.creator_username,
      },
    }));
    normalizedFavoriteRecipes = normalizeRecipes(recipesWithProfiles as RecipeWithProfile[]);
  } else {
    // Fallback to direct query (works when viewing your own profile while logged in)
    const { data: savedData, error: savedError } = await supabase
      .from('saved_recipes')
      .select('recipe_id')
      .eq('user_id', typedProfile.id)
      .order('saved_at', { ascending: false });

    if (!savedError && savedData && savedData.length > 0) {
      const recipeIds = savedData.map((item: { recipe_id: string }) => item.recipe_id);
      const { data: favoriteRecipesData, error: favoriteRecipesError } = await supabase
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
        .eq('is_public', true) // Only show public recipes in public profile view
        .order('created_at', { ascending: false });

      if (!favoriteRecipesError && favoriteRecipesData) {
        normalizedFavoriteRecipes = normalizeRecipes((favoriteRecipesData || []) as RecipeWithProfile[]);
      }
    }
  }

  // Step 4: Fetch user statistics
  const { data: recipesForStats, error: statsError } = await supabase
    .from('recipes')
    .select('id, view_count')
    .eq('user_id', typedProfile.id);

  const totalViews = (recipesForStats || []).reduce(
    (sum: number, r: { view_count: number }) => sum + r.view_count,
    0
  );

  const { count: favoritedCount, error: favoritesError } = await supabase
    .from('saved_recipes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', typedProfile.id);

  const stats: UserStats = {
    totalViews,
    favoritedRecipesCount: favoritesError || favoritedCount === null ? 0 : favoritedCount,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <ProfileViewClient
        profile={typedProfile}
        initialPublicRecipes={normalizedRecipes}
        initialFavoriteRecipes={normalizedFavoriteRecipes}
        initialStats={stats}
      />
    </div>
  );
}

