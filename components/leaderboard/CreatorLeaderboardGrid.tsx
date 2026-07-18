/**
 * Creator cards for Rising creator leaderboards.
 */

import Link from 'next/link';
import Image from 'next/image';

export interface LeaderboardCreator {
  user_id: string;
  username: string;
  avatar_url: string | null;
  recipe_count: number;
  view_count: number;
  favorite_count: number;
  rating_count: number;
  average_rating: number;
  score: number;
  rank: number;
}

interface CreatorLeaderboardGridProps {
  creators: LeaderboardCreator[];
  emptyMessage: string;
}

export default function CreatorLeaderboardGrid({
  creators,
  emptyMessage,
}: CreatorLeaderboardGridProps) {
  if (creators.length === 0) {
    return (
      <div className="text-center py-16 text-base-content/60">{emptyMessage}</div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {creators.map((creator) => (
        <div key={creator.user_id} className="relative pt-3">
          <div className="absolute top-0 left-0 z-10 flex flex-wrap items-center gap-1.5 sm:gap-2 max-w-full">
            <span className="badge badge-primary badge-sm sm:badge-lg font-bold">
              #{creator.rank}
            </span>
            <span className="badge badge-secondary badge-sm sm:badge-lg">
              {creator.score.toLocaleString()} pts
            </span>
          </div>
          <Link
            href={`/profile/${creator.username}`}
            className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow block"
          >
            <div className="card-body p-4 sm:p-6 items-center text-center">
              <div className="avatar">
                <div className="w-20 sm:w-24 rounded-full bg-base-300">
                  {creator.avatar_url ? (
                    <Image
                      src={creator.avatar_url}
                      alt={creator.username}
                      width={96}
                      height={96}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-base-300 flex items-center justify-center">
                      <span className="text-2xl sm:text-3xl font-bold">
                        {creator.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <h2 className="card-title arial-font text-base-content text-lg sm:text-xl justify-center">
                {creator.username}
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm opacity-60">
                <span>
                  {creator.recipe_count.toLocaleString()}{' '}
                  {creator.recipe_count === 1 ? 'recipe' : 'recipes'}
                </span>
                <span>•</span>
                <span>{creator.view_count.toLocaleString()} views</span>
                <span>•</span>
                <span>{creator.favorite_count.toLocaleString()} favorites</span>
                {creator.rating_count > 0 && (
                  <>
                    <span>•</span>
                    <span>
                      <span className="text-warning">★</span>{' '}
                      {Number(creator.average_rating).toFixed(1)} ({creator.rating_count})
                    </span>
                  </>
                )}
              </div>
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}
