/**
 * RecipeRatings
 *
 * Per-user star rating (1-5) plus an optional short text review (max 250 chars)
 * for a public recipe. Rendered just below the Notes section on the recipe page.
 *
 * Behaviour:
 * - Shows the average rating (large stars + "X.X out of 5 · N ratings") read
 *   from the `recipe_rating_stats` view.
 * - A logged-in, non-owner viewer of a public recipe can set their rating by
 *   clicking a star (immediate upsert) and optionally save a short review.
 * - Logged-out viewers see the average + reviews but the stars are disabled with
 *   a "Log in to rate" tooltip.
 * - Owners cannot rate their own recipe (inline note shown instead).
 * - Reviews are screened against utils/badWords.ts before saving; a matching DB
 *   trigger rejects them server-side as a backstop.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabase-client';
import { containsBadWords } from '@/utils/badWords';
import { relativeTime } from '@/utils/relativeTime';

const MAX_REVIEW_LENGTH = 250;

interface RecipeRatingsProps {
  recipeId: string;
  isOwner: boolean;
  isPublic: boolean;
}

interface ReviewRow {
  id: string;
  user_id: string;
  rating: number;
  review: string | null;
  created_at: string;
  updated_at: string;
  username: string;
}

interface RatingStats {
  averageRating: number;
  ratingCount: number;
}

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  );
}

export default function RecipeRatings({ recipeId, isOwner, isPublic }: RecipeRatingsProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [stats, setStats] = useState<RatingStats>({ averageRating: 0, ratingCount: 0 });
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [hasExistingRating, setHasExistingRating] = useState(false);

  const [saving, setSaving] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canRate = !!userId && !isOwner && isPublic;

  const loadData = useCallback(
    async (currentUserId: string | null) => {
      setLoadingData(true);

      const [statsResult, reviewsResult] = await Promise.all([
        supabaseClient
          .from('recipe_rating_stats')
          .select('rating_count, average_rating')
          .eq('recipe_id', recipeId)
          .maybeSingle(),
        supabaseClient
          .from('recipe_ratings')
          .select('id, user_id, rating, review, created_at, updated_at')
          .eq('recipe_id', recipeId)
          .order('updated_at', { ascending: false }),
      ]);

      if (statsResult.data) {
        setStats({
          ratingCount: Number(statsResult.data.rating_count) || 0,
          averageRating: Number(statsResult.data.average_rating) || 0,
        });
      } else {
        setStats({ averageRating: 0, ratingCount: 0 });
      }

      const rawReviews = (reviewsResult.data || []) as Array<Omit<ReviewRow, 'username'>>;

      // Resolve author usernames in a single follow-up query so we don't depend
      // on a PostgREST embed relationship existing between ratings and profiles.
      let usernameById = new Map<string, string>();
      const authorIds = Array.from(new Set(rawReviews.map((r) => r.user_id)));
      if (authorIds.length > 0) {
        const { data: profiles } = await supabaseClient
          .from('profiles')
          .select('id, username')
          .in('id', authorIds);
        usernameById = new Map(
          (profiles || []).map((p: { id: string; username: string }) => [p.id, p.username])
        );
      }

      const merged: ReviewRow[] = rawReviews.map((r) => ({
        ...r,
        username: usernameById.get(r.user_id) || 'Unknown',
      }));
      setReviews(merged);

      // Seed the editor with the viewer's existing rating, if any.
      if (currentUserId) {
        const mine = merged.find((r) => r.user_id === currentUserId);
        if (mine) {
          setSelectedRating(mine.rating);
          setReviewText(mine.review || '');
          setHasExistingRating(true);
        } else {
          setHasExistingRating(false);
        }
      }

      setLoadingData(false);
    },
    [recipeId]
  );

  useEffect(() => {
    let active = true;

    const init = async () => {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      if (!active) return;
      const id = user?.id ?? null;
      setUserId(id);
      setLoadingUser(false);
      await loadData(id);
    };

    init();
    return () => {
      active = false;
    };
  }, [loadData]);

  const upsertRating = useCallback(
    async (rating: number, review: string | null) => {
      if (!userId) return false;
      const { error: upsertError } = await supabaseClient.from('recipe_ratings').upsert(
        {
          recipe_id: recipeId,
          user_id: userId,
          rating,
          review,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'recipe_id,user_id' }
      );

      if (upsertError) {
        console.error('Error saving rating:', upsertError);
        return false;
      }
      return true;
    },
    [recipeId, userId]
  );

  const handleStarClick = async (value: number) => {
    if (!canRate || saving) return;
    setError(null);
    setSuccess(null);
    setSelectedRating(value);
    setSaving(true);
    // Preserve any existing review text already saved by the user.
    const reviewToKeep = reviewText.trim().length ? reviewText.trim() : null;
    const ok = await upsertRating(value, reviewToKeep && !containsBadWords(reviewToKeep) ? reviewToKeep : null);
    if (ok) {
      setHasExistingRating(true);
      await loadData(userId);
    } else {
      setError('Could not save your rating. Please try again.');
    }
    setSaving(false);
  };

  const handleSaveReview = async () => {
    if (!canRate || saving) return;
    setError(null);
    setSuccess(null);
    setReviewError(null);

    if (selectedRating < 1) {
      setError('Please pick a star rating first.');
      return;
    }

    const trimmed = reviewText.trim();
    if (trimmed.length > 0 && containsBadWords(trimmed)) {
      setReviewError('Please remove inappropriate language');
      return;
    }

    setSaving(true);
    const ok = await upsertRating(selectedRating, trimmed.length ? trimmed : null);
    if (ok) {
      setHasExistingRating(true);
      setSuccess('Your rating was saved.');
      await loadData(userId);
    } else {
      setError('Could not save your review. Please try again.');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!userId || saving) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    const { error: deleteError } = await supabaseClient
      .from('recipe_ratings')
      .delete()
      .eq('recipe_id', recipeId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting rating:', deleteError);
      setError('Could not remove your rating. Please try again.');
    } else {
      setSelectedRating(0);
      setReviewText('');
      setHasExistingRating(false);
      await loadData(userId);
    }
    setSaving(false);
  };

  const remaining = MAX_REVIEW_LENGTH - reviewText.length;
  const countdownClass =
    remaining <= 0 ? 'text-error' : remaining <= 25 ? 'text-warning' : 'text-base-content/50';

  const averageLabel = useMemo(() => {
    if (stats.ratingCount === 0) return null;
    return `${stats.averageRating.toFixed(1)} out of 5 · ${stats.ratingCount} ${
      stats.ratingCount === 1 ? 'rating' : 'ratings'
    }`;
  }, [stats]);

  const roundedAverage = Math.round(stats.averageRating);

  return (
    <div className="mb-8">
      <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 special-elite-regular">Ratings &amp; Reviews</h2>

      {/* Average summary */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-1 text-warning" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon key={star} filled={star <= roundedAverage} className="w-7 h-7 sm:w-8 sm:h-8" />
          ))}
        </div>
        {averageLabel ? (
          <span className="text-base sm:text-lg arial-font text-base-content/80">{averageLabel}</span>
        ) : (
          <span className="text-base sm:text-lg arial-font text-base-content/60">No ratings yet</span>
        )}
      </div>

      {/* Rating editor */}
      {isOwner ? (
        <div className="alert mb-6">
          <span className="arial-font text-sm sm:text-base">
            You can&apos;t rate your own recipe.
          </span>
        </div>
      ) : !isPublic ? null : (
        <div className="card bg-base-200 mb-6">
          <div className="card-body p-4 sm:p-6 gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="arial-font text-sm sm:text-base font-semibold text-base-content">
                {hasExistingRating ? 'Your rating' : 'Rate this recipe'}
              </span>
              <div
                className="flex items-center gap-1"
                onMouseLeave={() => setHoverRating(0)}
                title={!userId ? 'Log in to rate' : undefined}
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating || selectedRating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleStarClick(star)}
                      onMouseEnter={() => canRate && setHoverRating(star)}
                      disabled={!canRate || saving}
                      className={`btn btn-ghost btn-sm btn-circle ${
                        active ? 'text-warning' : 'text-base-content/30'
                      } ${!canRate ? 'cursor-not-allowed' : ''}`}
                      aria-label={`Rate ${star} ${star === 1 ? 'star' : 'stars'}`}
                      aria-pressed={selectedRating === star}
                      title={!userId ? 'Log in to rate' : `Rate ${star} ${star === 1 ? 'star' : 'stars'}`}
                    >
                      <StarIcon filled={active} className="w-6 h-6" />
                    </button>
                  );
                })}
              </div>
            </div>

            {!userId && !loadingUser && (
              <p className="text-sm arial-font text-base-content/60">
                <Link href="/login" className="link link-primary">
                  Log in
                </Link>{' '}
                to rate and review this recipe.
              </p>
            )}

            {canRate && (
              <>
                <div className="form-control">
                  <textarea
                    className={`textarea textarea-bordered w-full arial-font ${
                      reviewError ? 'textarea-error' : ''
                    }`}
                    rows={3}
                    maxLength={MAX_REVIEW_LENGTH}
                    placeholder="Share a short review (optional)"
                    value={reviewText}
                    onChange={(e) => {
                      setReviewText(e.target.value);
                      if (reviewError) setReviewError(null);
                    }}
                    aria-label="Write a review"
                  />
                  <div className="mt-1 flex items-center justify-between">
                    {reviewError ? (
                      <span className="text-sm text-error arial-font">{reviewError}</span>
                    ) : (
                      <span className="text-sm arial-font text-base-content/40">&nbsp;</span>
                    )}
                    <span className={`text-sm font-mono ${countdownClass}`} aria-live="polite">
                      {reviewText.length} / {MAX_REVIEW_LENGTH}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveReview}
                    disabled={saving}
                  >
                    {saving ? <span className="loading loading-spinner loading-xs" /> : 'Save review'}
                  </button>
                  {hasExistingRating && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={handleDelete}
                      disabled={saving}
                    >
                      Remove my rating
                    </button>
                  )}
                  {success && <span className="text-sm text-success arial-font">{success}</span>}
                  {error && <span className="text-sm text-error arial-font">{error}</span>}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Reviews list */}
      <h3 className="text-lg font-bold mb-3 special-elite-regular">
        Reviews{stats.ratingCount > 0 ? ` (${stats.ratingCount})` : ''}
      </h3>
      {loadingData ? (
        <div className="flex justify-center py-6">
          <span className="loading loading-spinner" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-base-content/60 arial-font text-sm sm:text-base">
          No reviews yet. Be the first to share your thoughts.
        </p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => {
            const isMine = review.user_id === userId;
            return (
              <li key={review.id} className="border-b border-base-300 pb-4 last:border-b-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                  <div className="flex items-center text-warning" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarIcon key={star} filled={star <= review.rating} className="w-4 h-4" />
                    ))}
                  </div>
                  <span className="sr-only">{review.rating} out of 5</span>
                  <Link
                    href={`/profile/${review.username}`}
                    className="link link-primary text-sm arial-font break-all"
                  >
                    {review.username}
                  </Link>
                  {isMine && <span className="badge badge-ghost badge-sm">You</span>}
                  <span className="text-sm text-base-content/50">•</span>
                  <span className="text-sm text-base-content/50 arial-font">
                    {relativeTime(review.updated_at || review.created_at)}
                  </span>
                </div>
                {review.review && (
                  <p className="arial-font text-sm sm:text-base text-base-content/80 break-words">
                    {review.review}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
