import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase';
import { getProfileByUsername } from '@/lib/profileServer';
import { RECIPE_CARD_SELECT } from '@/lib/recipeQueries';
import { notFound } from 'next/navigation';
import { normalizeRecipes } from '@/utils/recipeNormalizer';
import type {
  Profile,
  RecipeWithProfile,
  UserStats,
  NormalizedRecipe,
  ProfileFollowInfo,
} from '@/types';
import ProfileViewClient from './ProfileViewClient';

interface ProfilePageProps {
  params: {
    username: string;
  };
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://recipealmanac.xyz';
  const decodedUsername = decodeURIComponent(params.username);

  const profile = await getProfileByUsername(decodedUsername);

  if (!profile) {
    return { title: 'Profile Not Found' };
  }

  const title = `${profile.username}'s Recipes`;
  const description =
    profile.profile_description ||
    `Browse ${profile.username}'s recipe collection on Recipe Almanac — the digital recipe book for sharing and discovering recipes.`;
  const canonicalUrl = `${siteUrl}/profile/${encodeURIComponent(profile.username)}`;

  const images = profile.avatar_url
    ? [{ url: profile.avatar_url, width: 400, height: 400, alt: `${profile.username}'s avatar` }]
    : [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: 'Recipe Almanac' }];

  return {
    title,
    description,
    openGraph: {
      type: 'profile',
      url: canonicalUrl,
      title: `${title} | Recipe Almanac`,
      description,
      images,
      siteName: 'Recipe Almanac',
    },
    twitter: {
      card: 'summary',
      title: `${title} | Recipe Almanac`,
      description,
      images: images.map((i) => i.url),
    },
    alternates: {
      canonical: canonicalUrl,
    },
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

  const typedProfile = await getProfileByUsername(decodedUsername);

  if (!typedProfile) {
    notFound();
  }

  // Resolve the viewing user (if any) so we can decide whether to show the
  // Follow button and whether they already follow this profile.
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const [
    recipesResult,
    rpcFavoriteResult,
    statsRecipesResult,
    savedCountResult,
    viewerFollowResult,
  ] = await Promise.all([
    supabase
      .from('recipes')
      .select(RECIPE_CARD_SELECT)
      .eq('user_id', typedProfile.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false }),
    (supabase.rpc as any)('get_public_favorited_recipes', { target_user_id: typedProfile.id }),
    supabase.from('recipes').select('id, view_count').eq('user_id', typedProfile.id),
    supabase
      .from('saved_recipes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', typedProfile.id),
    viewer && viewer.id !== typedProfile.id
      ? supabase
          .from('followers')
          .select('follower_id', { head: true, count: 'exact' })
          .eq('follower_id', viewer.id)
          .eq('followee_id', typedProfile.id)
      : Promise.resolve({ count: 0 } as { count: number }),
  ]);

  const { data: recipes, error: recipesError } = recipesResult;
  const { data: rpcFavoriteRecipes, error: rpcError } = rpcFavoriteResult;
  const { data: recipesForStats, error: statsError } = statsRecipesResult;
  const { count: favoritedCount, error: favoritesError } = savedCountResult;

  const followInfo: ProfileFollowInfo = {
    profileId: typedProfile.id,
    username: typedProfile.username,
    isOwnProfile: !!viewer && viewer.id === typedProfile.id,
    isLoggedIn: !!viewer,
    isFollowing: (viewerFollowResult.count ?? 0) > 0,
    followerCount: typedProfile.follower_count ?? 0,
    followingCount: typedProfile.following_count ?? 0,
  };

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
        .select(RECIPE_CARD_SELECT)
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
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-4xl">
      <ProfileViewClient
        profile={typedProfile}
        initialPublicRecipes={normalizedRecipes}
        initialFavoriteRecipes={normalizedFavoriteRecipes}
        initialStats={stats}
        followInfo={followInfo}
      />
    </div>
  );
}
