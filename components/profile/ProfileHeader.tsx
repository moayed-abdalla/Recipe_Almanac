/**
 * Profile Header Component
 * 
 * Reusable profile header component for displaying user profile information.
 */

import Image from 'next/image';
import Link from 'next/link';
import type { Profile } from '@/types';

interface ProfileHeaderProps {
  /**
   * Profile data to display
   */
  profile: Profile;
  
  /**
   * Whether to show edit button (typically when viewing own profile)
   */
  showEditButton?: boolean;
  
  /**
   * Optional statistics to display
   */
  stats?: {
    totalViews?: number;
    favoritedRecipesCount?: number;
  };
}

export default function ProfileHeader({ 
  profile, 
  showEditButton = false,
  stats 
}: ProfileHeaderProps) {
  return (
    <div className="card bg-base-200 shadow-xl mb-6 sm:mb-8">
      <div className="card-body p-4 sm:p-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6">
          {/* Avatar */}
          <div className="avatar shrink-0">
            <div className="w-24 sm:w-32 rounded-full bg-base-300">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.username}
                  width={128}
                  height={128}
                  className="rounded-full"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-base-300 flex items-center justify-center">
                  <span className="text-3xl sm:text-4xl font-bold">
                    {profile.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1 text-center md:text-left min-w-0 w-full">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 mb-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-base-content break-words">{profile.username}</h1>
              {showEditButton && (
                <Link href="/profile/edit" className="btn btn-primary btn-sm sm:btn w-full md:w-auto">
                  Edit Profile
                </Link>
              )}
            </div>
            {profile.profile_description && (
              <p className="text-base sm:text-lg opacity-80 mb-4 text-base-content break-words">{profile.profile_description}</p>
            )}
            
            {/* Statistics */}
            {stats && (stats.totalViews !== undefined || stats.favoritedRecipesCount !== undefined) && (
              <div className="stats stats-vertical sm:stats-horizontal shadow mt-4 w-full">
                {stats.totalViews !== undefined && (
                  <div className="stat px-3 sm:px-4 py-3">
                    <div className="stat-title text-xs sm:text-sm">Total Views</div>
                    <div className="stat-value text-primary text-2xl sm:text-3xl">{stats.totalViews.toLocaleString()}</div>
                    <div className="stat-desc">On recipes</div>
                  </div>
                )}
                {stats.favoritedRecipesCount !== undefined && (
                  <div className="stat px-3 sm:px-4 py-3">
                    <div className="stat-title text-xs sm:text-sm">Favorited Recipes</div>
                    <div className="stat-value text-secondary text-2xl sm:text-3xl">{stats.favoritedRecipesCount.toLocaleString()}</div>
                    <div className="stat-desc">Recipes favorited</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
