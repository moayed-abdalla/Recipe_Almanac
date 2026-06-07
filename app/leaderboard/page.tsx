/**
 * Leaderboard Page
 *
 * Displays the top 100 recipes ranked by a score:
 * - Favourites: 10 points each (the dominant "super-like" signal)
 * - Ratings: 2 points per rating, plus average × count (quality-weighted volume)
 * - Views: 1 point each
 *
 * Recipes are ordered from greatest to least score.
 */

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { getTotalTimeMinutes } from '@/utils/recipeTime';
import { getRecipeCardImageUrl } from '@/utils/recipeImage';

interface RecipeWithScore {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  description: string | null;
  view_count: number;
  favorite_count: number;
  rating_count: number;
  average_rating: number;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  tags: string[];
  username: string;
  score: number;
  rank: number;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://recipealmanac.xyz';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description:
    'Top 100 recipes ranked by community views and favourites. Discover the most popular, most-shared recipes on Recipe Almanac — the digital recipe book.',
  keywords: [
    'recipe leaderboard',
    'top recipes',
    'popular recipes',
    'most shared recipes',
    'best recipes online',
    'Recipe Almanac leaderboard',
  ],
  openGraph: {
    type: 'website',
    url: `${siteUrl}/leaderboard`,
    title: 'Leaderboard | Recipe Almanac',
    description:
      'Top 100 recipes ranked by community views and favourites. Discover the most popular recipes on Recipe Almanac.',
    siteName: 'Recipe Almanac',
    images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: 'Recipe Almanac Leaderboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Leaderboard | Recipe Almanac',
    description: 'Top 100 community-ranked recipes on Recipe Almanac.',
  },
  alternates: {
    canonical: `${siteUrl}/leaderboard`,
  },
};

export default async function LeaderboardPage() {
  const supabase = await createServerClient();

  // score = favorites*10 + rating_count*2 + ROUND(avg*count) + views — ranked in the DB.
  const { data, error } = await supabase.rpc('get_leaderboard_recipes', { p_limit: 100 });

  if (error) {
    console.error('Error fetching leaderboard:', error);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>Failed to load leaderboard. Please try again later.</span>
        </div>
      </div>
    );
  }

  const recipesWithScores: RecipeWithScore[] = (data ?? []) as RecipeWithScore[];

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 typewriter text-base-content">
            Leaderboard
          </h1>
          <p className="text-base sm:text-lg text-base-content/70 max-w-2xl mx-auto px-2">
            Top 100 recipes ranked by score. Favourites are the strongest signal
            at 10 points each, ratings add 2 points each plus a quality bonus
            (average × number of ratings), and every view counts as 1 point.
          </p>
        </div>

        {recipesWithScores.length === 0 ? (
          <div className="text-center py-16 text-base-content/60">
            No recipes on the leaderboard yet. Be the first to create and share
            a recipe!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {recipesWithScores.map((recipe) => (
              <div key={recipe.id} className="relative pt-3">
                <div className="absolute top-0 left-0 z-10 flex flex-wrap items-center gap-1.5 sm:gap-2 max-w-full">
                  <span className="badge badge-primary badge-sm sm:badge-lg font-bold">
                    #{recipe.rank}
                  </span>
                  <span className="badge badge-secondary badge-sm sm:badge-lg">
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
                        src={getRecipeCardImageUrl(recipe.image_url) ?? recipe.image_url}
                        alt={recipe.title}
                        width={400}
                        height={300}
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        loading="lazy"
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
                  <div className="card-body p-4 sm:p-6">
                    <h2 className="card-title arial-font text-base-content text-base sm:text-lg line-clamp-2">
                      {recipe.title}
                    </h2>
                    {recipe.description && (
                      <p className="text-sm opacity-70 line-clamp-2 arial-font text-base-content">
                        {recipe.description}
                      </p>
                    )}
                    <div className="card-actions flex-col items-stretch gap-2 mt-3 sm:mt-4">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm opacity-60 special-elite-regular text-base-content">
                          by {recipe.username}
                        </span>
                        <span className="text-sm opacity-60">•</span>
                        <span className="text-sm opacity-60">
                          {recipe.view_count.toLocaleString()} views
                        </span>
                        <span className="text-sm opacity-60">•</span>
                        <span className="text-sm opacity-60">
                          {recipe.favorite_count.toLocaleString()} favorites
                        </span>
                        {recipe.rating_count > 0 && (
                          <>
                            <span className="text-sm opacity-60">•</span>
                            <span className="text-sm opacity-60">
                              <span className="text-warning">★</span>{' '}
                              {recipe.average_rating.toFixed(1)} ({recipe.rating_count})
                            </span>
                          </>
                        )}
                        {(() => {
                          const totalTime = getTotalTimeMinutes(
                            recipe.prep_time_minutes,
                            recipe.cook_time_minutes
                          );
                          return totalTime != null ? (
                            <>
                              <span className="text-sm opacity-60">•</span>
                              <span className="text-sm opacity-60">{totalTime} min</span>
                            </>
                          ) : null;
                        })()}
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
