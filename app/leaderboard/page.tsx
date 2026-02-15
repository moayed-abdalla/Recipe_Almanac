/**
 * Leaderboard Page
 *
 * Displays the top 100 recipes ranked by a score:
 * - Favourites: 4 points each (when a recipe is listed as a user's favourite)
 * - Views: 1 point each
 *
 * Recipes are ordered from greatest to least score.
 */

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import type { NormalizedRecipe } from '@/types';

interface RecipeWithScore extends NormalizedRecipe {
  score: number;
  rank: number;
}

const extractFavoriteCount = (recipe: {
  favorite_count?: number | { count: number } | Array<{ count: number }>;
  saved_recipes?: number | { count: number } | Array<{ count: number }>;
}): number => {
  const candidate = recipe.favorite_count ?? recipe.saved_recipes;
  if (typeof candidate === 'number') return candidate;
  if (Array.isArray(candidate)) return candidate[0]?.count ?? 0;
  if (candidate && typeof candidate === 'object' && 'count' in candidate) {
    return candidate.count ?? 0;
  }
  return 0;
};

export const metadata: Metadata = {
  title: 'Leaderboard | Recipe Almanac',
  description:
    'Top 100 recipes ranked by views and favourites. Discover the most popular recipes on Recipe Almanac.',
};

export default async function LeaderboardPage() {
  const supabase = await createServerClient();

  const { data: recipes, error } = await supabase
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
      profiles:user_id (
        username
      )
    `)
    .eq('is_public', true);

  if (error) {
    console.error('Error fetching recipes for leaderboard:', error);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>Failed to load leaderboard. Please try again later.</span>
        </div>
      </div>
    );
  }

  const typedRecipes = (recipes || []).map((recipe: Record<string, unknown>) => {
    const profile = Array.isArray(recipe.profiles)
      ? recipe.profiles[0]
      : recipe.profiles;
    return {
      ...recipe,
      favorite_count: extractFavoriteCount(recipe as Parameters<typeof extractFavoriteCount>[0]),
      profiles: profile || { username: 'Unknown' },
    };
  }) as (NormalizedRecipe & { view_count: number })[];

  const recipesWithScores: RecipeWithScore[] = typedRecipes
    .map((recipe) => {
      const favoriteCount = recipe.favorite_count ?? 0;
      const viewCount = recipe.view_count ?? 0;
      const score = favoriteCount * 4 + viewCount * 1;
      return { ...recipe, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 100)
    .map((recipe, index) => ({ ...recipe, rank: index + 1 }));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 typewriter text-base-content">
            Leaderboard
          </h1>
          <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
            Top 100 recipes ranked by score. Favourites count as 4 points, views
            count as 1 point.
          </p>
        </div>

        {recipesWithScores.length === 0 ? (
          <div className="text-center py-16 text-base-content/60">
            No recipes on the leaderboard yet. Be the first to create and share
            a recipe!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipesWithScores.map((recipe) => (
              <div key={recipe.id} className="relative">
                <div className="absolute -top-2 -left-2 z-10 flex items-center gap-2">
                  <span className="badge badge-primary badge-lg font-bold">
                    #{recipe.rank}
                  </span>
                  <span className="badge badge-secondary badge-lg">
                    {recipe.score.toLocaleString()} pts
                  </span>
                </div>
                <Link
                  href={`/recipe/${recipe.slug}`}
                  className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow block"
                >
                  <figure>
                    {recipe.image_url ? (
                      <Image
                        src={recipe.image_url}
                        alt={recipe.title}
                        width={400}
                        height={300}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-base-300 flex items-center justify-center">
                        <span className="text-base-content opacity-50">
                          No Image
                        </span>
                      </div>
                    )}
                  </figure>
                  <div className="card-body">
                    <h2 className="card-title arial-font text-base-content">
                      {recipe.title}
                    </h2>
                    {recipe.description && (
                      <p className="text-sm opacity-70 line-clamp-2 arial-font text-base-content">
                        {recipe.description}
                      </p>
                    )}
                    <div className="card-actions justify-between items-center mt-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm opacity-60 special-elite-regular text-base-content">
                          by {recipe.profiles.username}
                        </span>
                        <span className="text-sm opacity-60">•</span>
                        <span className="text-sm opacity-60">
                          {recipe.view_count.toLocaleString()} views
                        </span>
                        <span className="text-sm opacity-60">•</span>
                        <span className="text-sm opacity-60">
                          {recipe.favorite_count.toLocaleString()} favorites
                        </span>
                      </div>
                      {recipe.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {recipe.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="badge badge-outline badge-sm arial-font"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
