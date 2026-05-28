/**
 * Recipe Card Component
 * 
 * Displays a preview card for a recipe with:
 * - Recipe image (or placeholder)
 * - Recipe title
 * - Description (truncated)
 * - Author username
 * - View count
 * - Tags (up to 3)
 * 
 * Clicking the card navigates to the full recipe page.
 * Fork functionality is available on the recipe detail page.
 * 
 * This is a Client Component because it needs to:
 * - Navigate to recipe pages
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';

interface RecipeCardProps {
  id: string;
  slug: string; // Recipe slug for URL (format: username-recipe-slug)
  title: string;
  imageUrl?: string | null;
  description?: string | null;
  username: string;
  viewCount: number;
  favoriteCount: number;
  averageRating?: number | null;
  ratingCount?: number | null;
  tags?: string[];
  totalTimeMinutes?: number | null; // Combined prep + cook time, when known
}

export default function RecipeCard({
  id,
  slug,
  title,
  imageUrl,
  description,
  username,
  viewCount,
  favoriteCount,
  averageRating = null,
  ratingCount = null,
  tags = [],
  totalTimeMinutes = null,
}: RecipeCardProps) {
  const showTotalTime = typeof totalTimeMinutes === 'number' && totalTimeMinutes > 0;
  const showRating = typeof ratingCount === 'number' && ratingCount > 0;
  return (
    <Link href={`/recipe/${slug}`} className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow h-full">
      <figure>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            width={400}
            height={300}
            className="w-full h-40 sm:h-48 object-cover"
          />
        ) : (
          <div className="w-full h-40 sm:h-48 bg-base-300 flex items-center justify-center">
            <span className="text-base-content opacity-50">No Image</span>
          </div>
        )}
      </figure>
      <div className="card-body p-4 sm:p-6">
        <h2 className="card-title arial-font text-base-content text-base sm:text-lg line-clamp-2">{title}</h2>
        {description && (
          <p className="text-sm opacity-70 line-clamp-2 arial-font text-base-content">{description}</p>
        )}
        <div className="card-actions flex-col items-stretch gap-2 mt-3 sm:mt-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-xs sm:text-sm opacity-60 special-elite-regular text-base-content">by {username}</span>
            {showRating && (
              <>
                <span className="text-xs sm:text-sm opacity-60">•</span>
                <span className="text-xs sm:text-sm opacity-60">
                  <span className="text-warning">★</span> {(averageRating ?? 0).toFixed(1)} ({ratingCount})
                </span>
              </>
            )}
            <span className="text-xs sm:text-sm opacity-60">•</span>
            <span className="text-xs sm:text-sm opacity-60">{viewCount.toLocaleString()} views</span>
            <span className="text-xs sm:text-sm opacity-60">•</span>
            <span className="text-xs sm:text-sm opacity-60">{favoriteCount.toLocaleString()} favorites</span>
            {showTotalTime && (
              <>
                <span className="text-xs sm:text-sm opacity-60">•</span>
                <span className="text-xs sm:text-sm opacity-60">{totalTimeMinutes} min</span>
              </>
            )}
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag, index) => (
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
  );
}

