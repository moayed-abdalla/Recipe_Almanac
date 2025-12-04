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
  title: string;
  imageUrl?: string | null;
  description?: string | null;
  username: string;
  viewCount: number;
  tags?: string[];
}

export default function RecipeCard({
  id,
  title,
  imageUrl,
  description,
  username,
  viewCount,
  tags = [],
}: RecipeCardProps) {
  return (
    <Link href={`/recipe/${id}`} className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow">
      <figure>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            width={400}
            height={300}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-base-300 flex items-center justify-center">
            <span className="text-base-content opacity-50">No Image</span>
          </div>
        )}
      </figure>
      <div className="card-body">
        <h2 className="card-title arial-font">{title}</h2>
        {description && (
          <p className="text-sm opacity-70 line-clamp-2 arial-font">{description}</p>
        )}
        <div className="card-actions justify-between items-center mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-60 special-elite-regular">by {username}</span>
            {/* COMMENTED OUT: View count display disabled */}
            {/* <span className="text-sm opacity-60">•</span>
            <span className="text-sm opacity-60">{viewCount} views</span> */}
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

