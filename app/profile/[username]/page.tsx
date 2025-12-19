import { createServerClient } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { normalizeRecipes } from '@/utils/recipeNormalizer';
import type { Profile, RecipeWithProfile, UserStats } from '@/types';
import ProfileViewClient from './ProfileViewClient';

interface ProfilePageProps {
  params: {
    username: string;
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = await createServerClient();

  // Step 1: Fetch user profile by username
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', params.username)
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

  // Step 3: Fetch user statistics
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
        initialStats={stats}
      />
    </div>
  );
}

