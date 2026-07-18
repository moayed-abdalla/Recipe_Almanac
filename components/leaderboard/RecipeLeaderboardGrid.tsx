/**
 * Recipe cards for the all-time and Rising recipe leaderboards.
 */

import Link from 'next/link';
import Image from 'next/image';
import { getTotalTimeMinutes } from '@/utils/recipeTime';
import { getRecipeCardImageUrl } from '@/utils/recipeImage';

export interface LeaderboardRecipe {
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

interface RecipeLeaderboardGridProps {
  recipes: LeaderboardRecipe[];
  emptyMessage: string;
}

export default function RecipeLeaderboardGrid({
  recipes,
  emptyMessage,
}: RecipeLeaderboardGridProps) {
  if (recipes.length === 0) {
    return (
      <div className="text-center py-16 text-base-content/60">{emptyMessage}</div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {recipes.map((recipe) => (
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
                  <span className="text-base-content opacity-50">No Image</span>
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
                        {Number(recipe.average_rating).toFixed(1)} ({recipe.rating_count})
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
  );
}
