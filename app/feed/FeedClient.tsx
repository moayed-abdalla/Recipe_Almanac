/**
 * Feed Client
 *
 * Interactive feed whose sources are independent toggle buttons rather than
 * mutually-exclusive tabs. Each enabled toggle (Following, Favourite Tags,
 * Favorites, Random) contributes recipes and the results are merged into a
 * single deduplicated grid.
 *
 * Handles auth gating and signal detection (does the user follow anyone / have
 * favourites / 5-star ratings).
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

type ToggleKey = 'following' | 'tags' | 'favorites' | 'random';

type Toggles = Record<ToggleKey, boolean>;

interface FeedSignals {
  followingCount: number;
  likedTags: string[];
  favoriteRecipes: NormalizedRecipe[];
  fiveStarCount: number;
}

const FILTERS: { id: ToggleKey; label: string }[] = [
  { id: 'following', label: 'Following' },
  { id: 'tags', label: 'Favourite Tags' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'random', label: 'Random' },
];

const NO_TOGGLES: Toggles = {
  following: false,
  tags: false,
  favorites: false,
  random: false,
};

/** Merge recipe lists in source order, keeping the first occurrence of each id. */
function mergeUnique(lists: NormalizedRecipe[][]): NormalizedRecipe[] {
  const seen = new Set<string>();
  const merged: NormalizedRecipe[] = [];
  for (const list of lists) {
    for (const recipe of list) {
      if (!seen.has(recipe.id)) {
        seen.add(recipe.id);
        merged.push(recipe);
      }
    }
  }
  return merged;
}

export default function FeedClient() {
  const { user, loading: authLoading } = useProfileContext();

  const [toggles, setToggles] = useState<Toggles>(NO_TOGGLES);
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

  const anyToggleOn = useMemo(
    () => Object.values(toggles).some(Boolean),
    [toggles]
  );

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
      // Default the toggles on for whatever the user actually has signal for.
      setToggles({
        following: followingIds.length > 0,
        tags: likedTags.length > 0,
        favorites: favoriteRecipes.length > 0,
        random: false,
      });
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

  // Load + merge the feed for whichever toggles are enabled.
  const loadFeed = useCallback(async () => {
    if (!user || !signals) return;

    if (!anyToggleOn) {
      setRecipes([]);
      return;
    }

    setFeedLoading(true);

    const sources: Promise<NormalizedRecipe[]>[] = [];
    if (toggles.following) sources.push(fetchFollowingFeed(user.id));
    if (toggles.tags) sources.push(fetchTagFeed(selectedTags, user.id));
    if (toggles.favorites) sources.push(Promise.resolve(signals.favoriteRecipes));
    if (toggles.random) sources.push(fetchRandomFeed(user.id));

    const lists = await Promise.all(sources);
    setRecipes(mergeUnique(lists));
    setFeedLoading(false);
  }, [user, signals, toggles, selectedTags, anyToggleOn]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const toggleSource = (key: ToggleKey) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

  // Show the guidance note when the user has no signals to build a feed from
  // and hasn't opted into the random selection.
  const showNoSignalNote = !hasAnySignal && !toggles.random;

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 typewriter text-base-content">
            Your Feed
          </h1>
          <p className="text-base-content/70">
            Toggle the sources below to build your feed. Enabled sources are
            combined into one list with no duplicates.
          </p>
        </div>

        {/* Filter toggles */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => toggleSource(filter.id)}
              aria-pressed={toggles[filter.id]}
              className={`btn btn-sm ${
                toggles[filter.id] ? 'btn-primary' : 'btn-outline'
              }`}
            >
              {filter.label}
            </button>
          ))}

          {toggles.tags && signals.likedTags.length > 0 && (
            <button
              type="button"
              onClick={openTagPopup}
              className="btn btn-sm btn-ghost"
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
                  onClick={() => setToggles((t) => ({ ...t, random: true }))}
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
        ) : !anyToggleOn ? (
          <div className="card bg-base-200 max-w-2xl mx-auto">
            <div className="card-body items-center text-center gap-2">
              <p className="text-base-content/70">
                Turn on a source above to build your feed.
              </p>
            </div>
          </div>
        ) : feedLoading ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : recipes.length === 0 ? (
          <div className="card bg-base-200 max-w-2xl mx-auto">
            <div className="card-body items-center text-center gap-2">
              <p className="text-base-content/70">
                No recipes match the selected sources right now. Try enabling
                more sources or following more creators.
              </p>
            </div>
          </div>
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
