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
    <div className="card bg-base-200 shadow-xl mb-8">
      <div className="card-body">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="avatar">
            <div className="w-32 rounded-full bg-base-300">
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
                  <span className="text-4xl font-bold">
                    {profile.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
              <h1 className="text-4xl font-bold">{profile.username}</h1>
              {showEditButton && (
                <Link href="/profile/edit" className="btn btn-primary">
                  Edit Profile
                </Link>
              )}
            </div>
            {profile.profile_description && (
              <p className="text-lg opacity-80 mb-4">{profile.profile_description}</p>
            )}
            
            {/* Statistics */}
            {stats && (stats.totalViews !== undefined || stats.favoritedRecipesCount !== undefined) && (
              <div className="stats stats-vertical md:stats-horizontal shadow mt-4">
                {stats.totalViews !== undefined && (
                  <div className="stat">
                    <div className="stat-title">Total Views</div>
                    <div className="stat-value text-primary">{stats.totalViews.toLocaleString()}</div>
                    <div className="stat-desc">On recipes</div>
                  </div>
                )}
                {stats.favoritedRecipesCount !== undefined && (
                  <div className="stat">
                    <div className="stat-title">Favorited Recipes</div>
                    <div className="stat-value text-secondary">{stats.favoritedRecipesCount.toLocaleString()}</div>
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
