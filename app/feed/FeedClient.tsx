/**
 * Feed Client
 *
 * Interactive feed with four filter modes. Handles auth gating, signal
 * detection (does the user follow anyone / have favourites / 5-star ratings)
 * and per-mode data fetching.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useProfileContext } from '@/contexts/ProfileContext';
import { supabaseClient } from '@/lib/supabase-client';
import RecipeGrid from '@/components/recipe/RecipeGrid';
import type { NormalizedRecipe } from '@/types';
import {
  fetchFollowingIds,
  fetchFollowingFeed,
  fetchLikedTags,
  fetchTagFeed,
  fetchRandomFeed,
  fetchFavoriteRecipes,
} from '@/lib/recipeService';

type FeedMode = 'following' | 'tags' | 'favorites' | 'random';

interface FeedSignals {
  followingCount: number;
  likedTags: string[];
  favoriteRecipes: NormalizedRecipe[];
  fiveStarCount: number;
}

const FILTERS: { id: FeedMode; label: string }[] = [
  { id: 'following', label: 'Following' },
  { id: 'tags', label: 'Favourite Tags' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'random', label: 'Random' },
];

export default function FeedClient() {
  const { user, loading: authLoading } = useProfileContext();

  const [mode, setMode] = useState<FeedMode>('following');
  const [signals, setSignals] = useState<FeedSignals | null>(null);
  const [signalsLoading, setSignalsLoading] = useState(true);

  const [recipes, setRecipes] = useState<NormalizedRecipe[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const tagDialogRef = useRef<HTMLDialogElement>(null);
  // Draft selection while the tag popup is open.
  const [draftTags, setDraftTags] = useState<string[]>([]);

  const hasAnySignal = useMemo(() => {
    if (!signals) return false;
    return (
      signals.followingCount > 0 ||
      signals.favoriteRecipes.length > 0 ||
      signals.fiveStarCount > 0
    );
  }, [signals]);

  // Load the user's feed signals once we know who they are.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setSignalsLoading(false);
      return;
    }

    let active = true;
    setSignalsLoading(true);

    (async () => {
      const [followingIds, likedTags, favoriteRecipes, fiveStarResult] =
        await Promise.all([
          fetchFollowingIds(user.id),
          fetchLikedTags(user.id),
          fetchFavoriteRecipes(user.id),
          supabaseClient
            .from('recipe_ratings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('rating', 5),
        ]);

      if (!active) return;

      setSelectedTags(likedTags);
      setSignals({
        followingCount: followingIds.length,
        likedTags,
        favoriteRecipes,
        fiveStarCount: fiveStarResult.count ?? 0,
      });
      setSignalsLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [user, authLoading]);

  // Load the feed for the active mode.
  const loadFeed = useCallback(async () => {
    if (!user || !signals) return;

    setFeedLoading(true);
    let result: NormalizedRecipe[] = [];

    switch (mode) {
      case 'following':
        result = await fetchFollowingFeed(user.id);
        break;
      case 'tags':
        result = await fetchTagFeed(selectedTags, user.id);
        break;
      case 'favorites':
        result = signals.favoriteRecipes;
        break;
      case 'random':
        result = await fetchRandomFeed(user.id);
        break;
    }

    setRecipes(result);
    setFeedLoading(false);
  }, [user, signals, mode, selectedTags]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const openTagPopup = () => {
    setDraftTags(selectedTags);
    tagDialogRef.current?.showModal();
  };

  const toggleDraftTag = (tag: string) => {
    setDraftTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const applyTagSelection = () => {
    setSelectedTags(draftTags);
    tagDialogRef.current?.close();
  };

  // --- Render states -------------------------------------------------------

  // Not signed in.
  if (!authLoading && !user) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 typewriter text-base-content">
            Your Feed
          </h1>
          <p className="text-base-content/70 mb-6">
            Sign in to see recipes from the people you follow and food that
            matches your taste.
          </p>
          <Link href="/login" className="btn btn-primary">
            Sign in to view your feed
          </Link>
        </div>
      </div>
    );
  }

  // Loading auth / signals.
  if (authLoading || signalsLoading || !signals) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  const showNoSignalNote = mode !== 'random' && !hasAnySignal;

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 typewriter text-base-content">
            Your Feed
          </h1>
          <p className="text-base-content/70">
            Recent recipes tailored to who you follow and what you love.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div role="tablist" className="tabs tabs-boxed bg-base-200">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                role="tab"
                type="button"
                onClick={() => setMode(filter.id)}
                className={`tab ${mode === filter.id ? 'tab-active' : ''}`}
                aria-selected={mode === filter.id}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {mode === 'tags' && signals.likedTags.length > 0 && (
            <button
              type="button"
              onClick={openTagPopup}
              className="btn btn-sm btn-outline"
            >
              Select tags
              {selectedTags.length > 0 && (
                <span className="badge badge-sm badge-primary">
                  {selectedTags.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* No-signal note (overrides the empty grid for non-random modes) */}
        {showNoSignalNote ? (
          <div className="card bg-base-200 max-w-2xl mx-auto">
            <div className="card-body items-center text-center gap-4">
              <h2 className="card-title">Your feed is empty for now</h2>
              <p className="text-base-content/70">
                Follow other users, rate recipes 5 stars, or add recipes to your
                favourites and we&apos;ll fill this feed with food you&apos;ll
                love. In the meantime, you can explore a random selection.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode('random')}
                  className="btn btn-primary btn-sm"
                >
                  Show me a random feed
                </button>
                <Link href="/leaderboard" className="btn btn-outline btn-sm">
                  Browse the leaderboard
                </Link>
              </div>
            </div>
          </div>
        ) : feedLoading ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : recipes.length === 0 ? (
          <EmptyForMode mode={mode} likedTagCount={signals.likedTags.length} />
        ) : (
          <RecipeGrid recipes={recipes} />
        )}
      </div>

      {/* Favourite tags popup */}
      <dialog ref={tagDialogRef} className="modal modal-bottom sm:modal-middle">
        <div className="modal-box">
          <form method="dialog">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              aria-label="Close"
            >
              ✕
            </button>
          </form>
          <h3 className="text-lg font-bold mb-2">Favourite tags</h3>
          <p className="text-sm text-base-content/60 mb-4">
            These come from recipes you favourited or rated 5 stars. Pick the
            tags you want in your feed.
          </p>

          {signals.likedTags.length === 0 ? (
            <p className="text-base-content/60 py-4">
              No favourite tags yet. Favourite a recipe or rate one 5 stars to
              build this list.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto py-1">
              {signals.likedTags.map((tag) => {
                const selected = draftTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleDraftTag(tag)}
                    aria-pressed={selected}
                    className={`badge badge-lg cursor-pointer ${
                      selected ? 'badge-primary' : 'badge-outline'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}

          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setDraftTags(signals.likedTags)}
              disabled={signals.likedTags.length === 0}
            >
              Select all
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={applyTagSelection}
            >
              Apply
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button aria-label="Close">close</button>
        </form>
      </dialog>
    </div>
  );
}

function EmptyForMode({
  mode,
  likedTagCount,
}: {
  mode: FeedMode;
  likedTagCount: number;
}) {
  let message: React.ReactNode;

  switch (mode) {
    case 'following':
      message = (
        <>
          <p className="text-base-content/70">
            You&apos;re not following anyone yet. Browse recipes and follow
            creators whose food you love.
          </p>
          <Link href="/leaderboard" className="btn btn-primary btn-sm">
            Browse the leaderboard
          </Link>
        </>
      );
      break;
    case 'tags':
      message =
        likedTagCount === 0 ? (
          <p className="text-base-content/70">
            Favourite a recipe or rate one 5 stars to build your favourite tags,
            then we&apos;ll show recipes that match your taste.
          </p>
        ) : (
          <p className="text-base-content/70">
            No recipes match your selected tags right now. Try selecting more
            tags.
          </p>
        );
      break;
    case 'favorites':
      message = (
        <p className="text-base-content/70">
          You haven&apos;t favourited any recipes yet. Tap the favourite button
          on a recipe to save it here.
        </p>
      );
      break;
    case 'random':
      message = (
        <p className="text-base-content/70">
          No public recipes to show right now. Check back soon.
        </p>
      );
      break;
  }

  return (
    <div className="card bg-base-200 max-w-2xl mx-auto">
      <div className="card-body items-center text-center gap-4">{message}</div>
    </div>
  );
}
