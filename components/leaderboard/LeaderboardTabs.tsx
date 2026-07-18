/**
 * Period + board navigation for the leaderboard page.
 * Uses Links so the Server Component re-fetches on navigation.
 */

'use client';

import Link from 'next/link';

export type LeaderboardPeriod = 'all' | 'week' | 'month';
export type LeaderboardBoard = 'recipes' | 'creators';

interface LeaderboardTabsProps {
  period: LeaderboardPeriod;
  board: LeaderboardBoard;
}

function hrefFor(period: LeaderboardPeriod, board: LeaderboardBoard): string {
  if (period === 'all') return '/leaderboard';
  return `/leaderboard?period=${period}&board=${board}`;
}

export default function LeaderboardTabs({ period, board }: LeaderboardTabsProps) {
  const risingBoard = period === 'all' ? 'recipes' : board;

  return (
    <div className="flex flex-col items-center gap-3 mb-8 sm:mb-10">
      <div className="tabs tabs-boxed flex-wrap justify-center">
        <Link
          href="/leaderboard"
          className={`tab ${period === 'all' ? 'tab-active' : ''}`}
        >
          All-time
        </Link>
        <Link
          href={hrefFor('week', risingBoard)}
          className={`tab ${period === 'week' ? 'tab-active' : ''}`}
        >
          Rising · Weekly
        </Link>
        <Link
          href={hrefFor('month', risingBoard)}
          className={`tab ${period === 'month' ? 'tab-active' : ''}`}
        >
          Rising · Monthly
        </Link>
      </div>

      {period !== 'all' && (
        <div className="tabs tabs-boxed">
          <Link
            href={hrefFor(period, 'recipes')}
            className={`tab ${board === 'recipes' ? 'tab-active' : ''}`}
          >
            Recipes
          </Link>
          <Link
            href={hrefFor(period, 'creators')}
            className={`tab ${board === 'creators' ? 'tab-active' : ''}`}
          >
            Creators
          </Link>
        </div>
      )}
    </div>
  );
}
