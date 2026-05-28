/**
 * Profile Page Component
 * 
 * Displays a user's public profile with:
 * - Username and avatar
 * - Profile description
 * - List of all public recipes created by the user
 * 
 * This is a Server Component that fetches data from Supabase.
 * Only public recipes are displayed on profile pages.
 * Users can see their own private recipes in "My Almanac".
 * 
 * @param params - Route parameters containing the username
 */

import { createServerClient } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import RecipeCard from '@/components/RecipeCard';
import { getTotalTimeMinutes } from '@/utils/recipeTime';

interface ProfileViewPageProps {
  params: {
    username: string;
  };
}

interface Profile {
  id: string;
  username: string;
  profile_description: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface Recipe {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  tags: string[];
  method_steps: string[];
  notes: string[];
  view_count: number;
  favorite_count: number;
  average_rating: number;
  rating_count: number;
  is_public: boolean;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  created_at: string;
  updated_at: string;
}

const extractFavoriteCount = (recipe: any): number => {
  const candidate = recipe.favorite_count ?? recipe.saved_recipes;
  if (typeof candidate === 'number') return candidate;
  if (Array.isArray(candidate)) return candidate[0]?.count ?? 0;
  if (candidate && typeof candidate === 'object' && 'count' in candidate) {
    return candidate.count ?? 0;
  }
  return 0;
};

const extractRatingStats = (
  recipe: any
): { average_rating: number; rating_count: number } => {
  const candidate = recipe.recipe_rating_stats;
  const row = Array.isArray(candidate) ? candidate[0] : candidate;
  if (row && typeof row === 'object') {
    return {
      average_rating: Number(row.average_rating) || 0,
      rating_count: Number(row.rating_count) || 0,
    };
  }
  return { average_rating: 0, rating_count: 0 };
};

export default async function ProfileViewPage({ params }: ProfileViewPageProps) {
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

  // Step 2: Fetch user's public recipes
  // Only public recipes are shown on profile pages
  // Users can see their own private recipes in "My Almanac"
  const { data: recipes, error: recipesError } = await supabase
    .from('recipes')
    .select(`
      *,
      favorite_count:saved_recipes(count),
      recipe_rating_stats (
        rating_count,
        average_rating
      )
    `)
    .eq('user_id', typedProfile.id)
    .eq('is_public', true) // Only show public recipes
    .order('created_at', { ascending: false }); // Most recent first

  // Handle errors gracefully
  if (recipesError) {
    console.error('Error fetching recipes:', recipesError);
  }

  // Type assertion for recipes array
  const typedRecipes = (recipes || []).map((recipe: any) => {
    const ratingStats = extractRatingStats(recipe);
    return {
      ...recipe,
      favorite_count: extractFavoriteCount(recipe),
      average_rating: ratingStats.average_rating,
      rating_count: ratingStats.rating_count,
    };
  }) as Recipe[];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="card bg-base-200 shadow-xl mb-8">
          <div className="card-body">
            <div className="flex items-center gap-4">
              <div className="avatar">
                <div className="w-24 rounded-full bg-base-300">
                  {typedProfile.avatar_url ? (
                    <img
                      src={typedProfile.avatar_url}
                      alt={typedProfile.username}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-base-300 flex items-center justify-center">
                      <span className="text-2xl font-bold">
                        {typedProfile.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold">{typedProfile.username}</h1>
                {typedProfile.profile_description && (
                  <p className="mt-2">{typedProfile.profile_description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User's Recipes */}
        <h2 className="text-2xl font-bold mb-4">Recipes</h2>
        {typedRecipes.length === 0 ? (
          <p className="text-center opacity-60 py-8">No recipes yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {typedRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                id={recipe.id}
                slug={recipe.slug}
                title={recipe.title}
                imageUrl={recipe.image_url}
                description={recipe.description}
                username={typedProfile.username}
                viewCount={recipe.view_count}
                favoriteCount={recipe.favorite_count}
                averageRating={recipe.average_rating}
                ratingCount={recipe.rating_count}
                tags={recipe.tags}
                totalTimeMinutes={getTotalTimeMinutes(recipe.prep_time_minutes, recipe.cook_time_minutes)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
