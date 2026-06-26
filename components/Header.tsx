/**
 * Header Component
 * 
 * Global navigation header that appears on all pages.
 * Features:
 * - Site logo and title (links to homepage)
 * - User profile dropdown (when logged in) with:
 *   - My Profile link
 *   - My Almanac link
 *   - Create Recipe link
 *   - Import Recipe link
 *   - Logout button
 * - Login button (when not logged in)
 * - Theme toggle (light/dark mode)
 * 
 * This is a Client Component because it needs to:
 * - Handle user interactions and auth actions
 * - Toggle light/dark mode via ThemeProvider
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { useProfileContext } from '@/contexts/ProfileContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function Header() {
  const { user, profile } = useProfileContext();
  const { mode, toggleMode } = useTheme();

  // Online/offline state - drives the "Offline" pill
  const [isOffline, setIsOffline] = useState(false);

  /**
   * Track network connectivity so we can surface an "Offline" indicator.
   */
  useEffect(() => {
    const updateOnlineStatus = () => setIsOffline(!navigator.onLine);
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const supabase = supabaseClient;

  return (
    <header className="site-header navbar bg-base-100 shadow-lg border-b border-base-300 sticky top-0 z-50 min-h-14 h-auto py-1 px-3 sm:px-4">
      <div className="w-full max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 min-h-0">
        <div className="flex-1 flex items-center min-w-0">
          <Link
            href="/"
            className="header-brand btn btn-ghost normal-case px-1 sm:px-2 flex items-center gap-1.5 sm:gap-2 min-w-0"
          >
            <div className="logo-colorized w-8 h-8 sm:w-10 sm:h-10 shrink-0">
              <Image
                src="/logo.png"
                alt="Recipe Almanac"
                width={40}
                height={40}
                className="w-full h-full"
              />
            </div>
            <span className="typewriter text-base-content text-sm sm:text-base lg:text-xl whitespace-nowrap">
              Recipe Almanac
            </span>
          </Link>
        </div>
        
        <div className="flex-none gap-1 sm:gap-2 flex items-center shrink-0">
          {/* Offline indicator - only visible when the device has no network */}
          {isOffline && (
            <span
              className="badge badge-warning badge-sm sm:badge-md gap-1 font-semibold"
              role="status"
              aria-live="polite"
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-current"
                aria-hidden
              />
              Offline
            </span>
          )}
          {/* Feed Link - only for logged-in users; icon on mobile, text on desktop */}
          {user && (
            <Link
              href="/feed"
              data-tour="feed"
              className="btn btn-ghost btn-circle sm:rounded-btn sm:w-auto sm:h-auto sm:aspect-auto sm:px-4"
              aria-label="Feed"
            >
              <svg
                className="w-5 h-5 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                fillRule="evenodd"
                aria-hidden
              >
                <path d="M12 12 L19.66 5.57 A10 10 0 1 0 19.66 18.43 Z M13.2 7.5 A1.2 1.2 0 1 0 10.8 7.5 A1.2 1.2 0 1 0 13.2 7.5 Z" />
              </svg>
              <span className="hidden sm:inline">Feed</span>
            </Link>
          )}
          {/* Leaderboard Link - icon on small screens, text on larger to avoid clutter */}
          <Link
            href="/leaderboard"
            data-tour="leaderboard"
            className="btn btn-ghost btn-circle sm:rounded-btn sm:w-auto sm:h-auto sm:aspect-auto sm:px-4"
            aria-label="Leaderboard"
          >
            <span
              className="leaderboard-icon-mask inline-block w-5 h-5 shrink-0"
              aria-hidden
            />
            <span className="hidden sm:inline">Leaderboard</span>
          </Link>
          {/* Theme Toggle */}
          <button
            onClick={toggleMode}
            className="btn btn-ghost btn-circle"
            aria-label="Toggle theme"
          >
            {mode === 'light' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          {/* Profile Icon / Login Button */}
          {user ? (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} data-tour="profile" className="btn btn-ghost btn-circle avatar">
                <div className="w-10 rounded-full bg-base-300">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt="Profile"
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-base-300 flex items-center justify-center">
                      <span className="text-xs font-bold text-base-content">
                        {profile?.username?.charAt(0).toUpperCase() || user.user_metadata?.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </div>
              </label>
              <ul 
                tabIndex={0} 
                data-tour="profile-menu"
                className="mt-3 z-[1] p-2 shadow-lg menu menu-sm dropdown-content bg-base-100/95 backdrop-blur-sm rounded-box w-52 border border-base-300"
                onClick={(e) => {
                  // Close dropdown when clicking on a link
                  const target = e.target as HTMLElement;
                  if (target.closest('a') || target.closest('button')) {
                    // Small delay to allow navigation/action to start
                    setTimeout(() => {
                      const dropdown = document.activeElement as HTMLElement;
                      if (dropdown && dropdown.blur) {
                        dropdown.blur();
                      }
                    }, 100);
                  }
                }}
              >
                <li>
                  <Link href="/profile">Profile</Link>
                </li>
                <li>
                  <Link href="/almanac">My Almanac</Link>
                </li>
                <li>
                  <Link href="/recipe/create">Create Recipe</Link>
                </li>
                <li>
                  <Link href="/recipe/import">Import Recipe</Link>
                </li>
                <li>
                  <button 
                    onClick={async () => {
                      try {
                        const { error } = await supabase.auth.signOut();
                        if (error) throw error;
                        // Redirect to homepage after logout
                        window.location.href = '/';
                      } catch (error) {
                        console.error('Error signing out:', error);
                      }
                    }}
                  >
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm">
              Log In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

