/**
 * Profile Follow Button + Follow Counts
 *
 * Client component rendered inside the profile header. It shows:
 * - follower / following counts (each opens a modal listing those users)
 * - a Follow / Unfollow button for logged-in viewers who are not the owner
 *
 * The Follow / Unfollow action is optimistic: the button label and follower
 * count update immediately and roll back if the request fails.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  followUser,
  unfollowUser,
  getFollowList,
  type FollowListUser,
} from '@/lib/followService';

interface ProfileFollowButtonProps {
  /** auth.users id of the profile being viewed. */
  profileId: string;
  username: string;
  /** Viewer is the owner of this profile. */
  isOwnProfile: boolean;
  /** Viewer is signed in. */
  isLoggedIn: boolean;
  initialIsFollowing: boolean;
  initialFollowerCount: number;
  initialFollowingCount: number;
}

type ListType = 'followers' | 'following';

export default function ProfileFollowButton({
  profileId,
  username,
  isOwnProfile,
  isLoggedIn,
  initialIsFollowing,
  initialFollowerCount,
  initialFollowingCount,
}: ProfileFollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [followingCount] = useState(initialFollowingCount);
  const [pending, setPending] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [listType, setListType] = useState<ListType>('followers');
  const [listUsers, setListUsers] = useState<FollowListUser[]>([]);
  const [listLoading, setListLoading] = useState(false);

  // Keep state in sync if the server-provided props change (e.g. navigation).
  useEffect(() => {
    setIsFollowing(initialIsFollowing);
    setFollowerCount(initialFollowerCount);
  }, [initialIsFollowing, initialFollowerCount]);

  const handleToggleFollow = async () => {
    if (!isLoggedIn || pending) return;

    const nextFollowing = !isFollowing;
    // Optimistic update.
    setIsFollowing(nextFollowing);
    setFollowerCount((count) => count + (nextFollowing ? 1 : -1));
    setPending(true);

    const ok = nextFollowing
      ? await followUser(profileId)
      : await unfollowUser(profileId);

    if (!ok) {
      // Roll back.
      setIsFollowing(!nextFollowing);
      setFollowerCount((count) => count + (nextFollowing ? -1 : 1));
    }
    setPending(false);
  };

  const openList = async (type: ListType) => {
    setListType(type);
    setListUsers([]);
    setListLoading(true);
    dialogRef.current?.showModal();
    const users = await getFollowList(profileId, type);
    setListUsers(users);
    setListLoading(false);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Follow / Unfollow button — only for signed-in, non-owner viewers */}
      {isLoggedIn && !isOwnProfile && (
        <button
          type="button"
          onClick={handleToggleFollow}
          disabled={pending}
          aria-pressed={isFollowing}
          className={`btn btn-sm w-full md:w-auto ${
            isFollowing ? 'btn-outline' : 'btn-primary'
          }`}
        >
          {pending ? (
            <span className="loading loading-spinner loading-xs" />
          ) : isFollowing ? (
            'Following'
          ) : (
            'Follow'
          )}
        </button>
      )}

      {/* Follower / following counts */}
      <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-base-content/80">
        <button
          type="button"
          onClick={() => openList('followers')}
          className="link link-hover"
        >
          <span className="font-bold text-base-content">
            {followerCount.toLocaleString()}
          </span>{' '}
          {followerCount === 1 ? 'follower' : 'followers'}
        </button>
        <span aria-hidden="true" className="opacity-60">
          ·
        </span>
        <button
          type="button"
          onClick={() => openList('following')}
          className="link link-hover"
        >
          <span className="font-bold text-base-content">
            {followingCount.toLocaleString()}
          </span>{' '}
          following
        </button>
      </div>

      {/* Followers / following modal */}
      <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
        <div className="modal-box">
          <form method="dialog">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              aria-label="Close"
            >
              ✕
            </button>
          </form>
          <h3 className="text-lg font-bold mb-4">
            {listType === 'followers'
              ? `${username}'s followers`
              : `${username} is following`}
          </h3>

          {listLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner" />
            </div>
          ) : listUsers.length === 0 ? (
            <p className="text-base-content/60 py-6 text-center">
              {listType === 'followers'
                ? 'No followers yet.'
                : 'Not following anyone yet.'}
            </p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {listUsers.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/profile/${u.username}`}
                    onClick={() => dialogRef.current?.close()}
                    className="flex items-center gap-3 p-2 rounded-btn hover:bg-base-200 transition-colors"
                  >
                    <div className="avatar shrink-0">
                      <div className="w-10 rounded-full bg-base-300">
                        {u.avatar_url ? (
                          <Image
                            src={u.avatar_url}
                            alt={u.username}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-base-300 flex items-center justify-center">
                            <span className="text-sm font-bold">
                              {u.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-base-content truncate">
                        {u.username}
                      </div>
                      {u.profile_description && (
                        <div className="text-xs text-base-content/60 truncate">
                          {u.profile_description}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button aria-label="Close">close</button>
        </form>
      </dialog>
    </div>
  );
}
