/**
 * Leaderboard Page
 *
 * All-time top 100 recipes, plus Rising weekly/monthly boards for recipes and
 * creators. Score = favourites×10 + rating_count×2 + ROUND(avg×count) + views.
 * Rising boards use the same weights over a rolling 7-day or 30-day window.
 */

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase';
import LeaderboardTabs, {
  type LeaderboardBoard,
  type LeaderboardPeriod,
} from '@/components/leaderboard/LeaderboardTabs';
import RecipeLeaderboardGrid, {
  type LeaderboardRecipe,
} from '@/components/leaderboard/RecipeLeaderboardGrid';
import CreatorLeaderboardGrid, {
  type LeaderboardCreator,
} from '@/components/leaderboard/CreatorLeaderboardGrid';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://recipealmanac.xyz';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description:
    'Top recipes and rising creators ranked by community favourites, ratings, and views on Recipe Almanac.',
  keywords: [
    'recipe leaderboard',
    'top recipes',
    'popular recipes',
    'rising recipes',
    'most shared recipes',
    'best recipes online',
    'Recipe Almanac leaderboard',
  ],
  openGraph: {
    type: 'website',
    url: `${siteUrl}/leaderboard`,
    title: 'Leaderboard | Recipe Almanac',
    description:
      'Top recipes and rising creators ranked by community favourites, ratings, and views.',
    siteName: 'Recipe Almanac',
    images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: 'Recipe Almanac Leaderboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Leaderboard | Recipe Almanac',
    description: 'Top and rising community-ranked recipes on Recipe Almanac.',
  },
  alternates: {
    canonical: `${siteUrl}/leaderboard`,
  },
};

interface LeaderboardPageProps {
  searchParams: {
    period?: string;
    board?: string;
  };
}

function parsePeriod(raw: string | undefined): LeaderboardPeriod {
  if (raw === 'week' || raw === 'month') return raw;
  return 'all';
}

function parseBoard(raw: string | undefined, period: LeaderboardPeriod): LeaderboardBoard {
  if (period === 'all') return 'recipes';
  if (raw === 'creators') return 'creators';
  return 'recipes';
}

function subtitleFor(period: LeaderboardPeriod, board: LeaderboardBoard): string {
  if (period === 'all') {
    return 'Top 100 recipes ranked by score. Favourites are the strongest signal at 10 points each, ratings add 2 points each plus a quality bonus (average × number of ratings), and every view counts as 1 point.';
  }
  const windowLabel = period === 'week' ? 'last 7 days' : 'last 30 days';
  if (board === 'creators') {
    return `Creators ranked by engagement on their public recipes in the ${windowLabel}. Same scoring as recipes: favourites × 10, ratings volume and quality, plus views.`;
  }
  return `Recipes ranked by engagement in the ${windowLabel}. Favourites × 10, ratings add volume and quality points, and every view counts as 1 point.`;
}

function emptyMessageFor(period: LeaderboardPeriod, board: LeaderboardBoard): string {
  if (period === 'all') {
    return 'No recipes on the leaderboard yet. Be the first to create and share a recipe!';
  }
  const windowLabel = period === 'week' ? 'this week' : 'this month';
  if (board === 'creators') {
    return `No rising creators yet ${windowLabel}. Favourites, ratings, and views will surface creators here.`;
  }
  return `No rising activity yet ${windowLabel}. Favourites, ratings, and views will appear here.`;
}

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const period = parsePeriod(searchParams.period);
  const board = parseBoard(searchParams.board, period);
  const supabase = await createServerClient();

  let recipes: LeaderboardRecipe[] = [];
  let creators: LeaderboardCreator[] = [];
  let loadError = false;

  if (period === 'all') {
    const { data, error } = await supabase.rpc('get_leaderboard_recipes', { p_limit: 100 });
    if (error) {
      console.error('Error fetching leaderboard:', error);
      loadError = true;
    } else {
      recipes = (data ?? []) as LeaderboardRecipe[];
    }
  } else if (board === 'creators') {
    const { data, error } = await supabase.rpc('get_rising_creators', {
      p_period: period,
      p_limit: 100,
    });
    if (error) {
      console.error('Error fetching rising creators:', error);
      loadError = true;
    } else {
      creators = (data ?? []) as LeaderboardCreator[];
    }
  } else {
    const { data, error } = await supabase.rpc('get_rising_recipes', {
      p_period: period,
      p_limit: 100,
    });
    if (error) {
      console.error('Error fetching rising recipes:', error);
      loadError = true;
    } else {
      recipes = (data ?? []) as LeaderboardRecipe[];
    }
  }

  if (loadError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>Failed to load leaderboard. Please try again later.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 typewriter text-base-content">
            Leaderboard
          </h1>
          <p className="text-base sm:text-lg text-base-content/70 max-w-2xl mx-auto px-2">
            {subtitleFor(period, board)}
          </p>
        </div>

        <LeaderboardTabs period={period} board={board} />

        {board === 'creators' && period !== 'all' ? (
          <CreatorLeaderboardGrid
            creators={creators}
            emptyMessage={emptyMessageFor(period, board)}
          />
        ) : (
          <RecipeLeaderboardGrid
            recipes={recipes}
            emptyMessage={emptyMessageFor(period, board)}
          />
        )}
      </div>
    </div>
  );
}
