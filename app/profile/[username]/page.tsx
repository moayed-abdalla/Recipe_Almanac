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

type RPCFavoriteRecipe = {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  description: string | null;
  view_count: number;
  favorite_count?: number;
  tags: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  creator_username: string;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = await createServerClient();

  const decodedUsername = decodeURIComponent(params.username);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', decodedUsername)
    .single();

  if (profileError || !profile) {
    console.error('Profile fetch error:', profileError);
    notFound();
  }

  const typedProfile = profile as Profile;

  const [
    recipesResult,
    rpcFavoriteResult,
    statsRecipesResult,
    savedCountResult,
  ] = await Promise.all([
    supabase
      .from('recipes')
      .select(`
      id,
      slug,
      title,
      image_url,
      description,
      view_count,
      favorite_count:saved_recipes(count),
      tags,
      is_public,
      profiles:user_id (
        username
      )
    `)
      .eq('user_id', typedProfile.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false }),
    (supabase.rpc as any)('get_public_favorited_recipes', { target_user_id: typedProfile.id }),
    supabase.from('recipes').select('id, view_count').eq('user_id', typedProfile.id),
    supabase
      .from('saved_recipes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', typedProfile.id),
  ]);

  const { data: recipes, error: recipesError } = recipesResult;
  const { data: rpcFavoriteRecipes, error: rpcError } = rpcFavoriteResult;
  const { data: recipesForStats, error: statsError } = statsRecipesResult;
  const { count: favoritedCount, error: favoritesError } = savedCountResult;

  if (recipesError) {
    console.error('Error fetching recipes:', recipesError);
  }
  if (statsError) {
    console.error('Error fetching recipe stats:', statsError);
  }

  const normalizedRecipes = normalizeRecipes((recipes || []) as RecipeWithProfile[]);

  let normalizedFavoriteRecipes: NormalizedRecipe[] = [];

  if (!rpcError && rpcFavoriteRecipes && rpcFavoriteRecipes.length > 0) {
    const recipesWithProfiles = (rpcFavoriteRecipes as RPCFavoriteRecipe[]).map(
      (recipe: RPCFavoriteRecipe) => ({
        id: recipe.id,
        slug: recipe.slug,
        title: recipe.title,
        image_url: recipe.image_url,
        description: recipe.description,
        view_count: recipe.view_count,
        favorite_count: recipe.favorite_count ?? 0,
        tags: recipe.tags,
        is_public: recipe.is_public,
        profiles: {
          username: recipe.creator_username,
        },
      })
    );
    normalizedFavoriteRecipes = normalizeRecipes(recipesWithProfiles as RecipeWithProfile[]);
  } else {
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
          favorite_count:saved_recipes(count),
          tags,
          is_public,
          profiles:user_id (
            username
          )
        `)
        .in('id', recipeIds)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (!favoriteRecipesError && favoriteRecipesData) {
        normalizedFavoriteRecipes = normalizeRecipes((favoriteRecipesData || []) as RecipeWithProfile[]);
      }
    }
  }

  const totalViews = (recipesForStats || []).reduce(
    (sum: number, r: { view_count: number }) => sum + r.view_count,
    0
  );

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
