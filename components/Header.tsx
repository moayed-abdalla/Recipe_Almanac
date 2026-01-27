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
 *   - Logout button
 * - Login button (when not logged in)
 * - Theme toggle (light/dark mode)
 * 
 * This is a Client Component because it needs to:
 * - Access localStorage for theme persistence
 * - Listen to auth state changes
 * - Handle user interactions
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import type { Session } from '@supabase/supabase-js';
import { DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME, getThemeById, type LightThemeId, type DarkThemeId } from '@/lib/theme-config';

interface ProfileData {
  avatar_url: string | null;
  username: string;
  default_light_theme?: LightThemeId | null;
  default_dark_theme?: DarkThemeId | null;
}

export default function Header() {
  // Theme state - controls light/dark mode
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // User state - current authenticated user
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: { username?: string; avatar_url?: string } } | null>(null);
  
  // Profile data (avatar and username from profiles table)
  const [profile, setProfile] = useState<ProfileData | null>(null);
  
  // Supabase client for authentication
  const supabase = supabaseClient;

  /**
   * Fetch profile data from profiles table
   */
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url, username, default_light_theme, default_dark_theme')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as ProfileData;
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      return null;
    }
  };

  /**
   * Detect system theme preference
   */
  const getSystemThemePreference = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  /**
   * Get the theme ID to apply based on current mode and user preferences
   */
  const getThemeId = useCallback((mode: 'light' | 'dark', profileData: ProfileData | null): string => {
    if (mode === 'light') {
      return profileData?.default_light_theme || DEFAULT_LIGHT_THEME;
    } else {
      return profileData?.default_dark_theme || DEFAULT_DARK_THEME;
    }
  }, []);

  /**
   * Apply theme to document
   */
  const applyTheme = useCallback((mode: 'light' | 'dark', profileData: ProfileData | null) => {
    const themeId = getThemeId(mode, profileData);
    document.documentElement.setAttribute('data-theme', themeId);
    // Also set data-theme-mode for CSS targeting
    document.documentElement.setAttribute('data-theme-mode', mode);
  }, [getThemeId]);

  /**
   * Initialize theme and user session on component mount
   */
  useEffect(() => {
    try {
      // Detect system preference
      const systemPreference = getSystemThemePreference();
      
      // Get saved theme mode from localStorage, or use system preference
      const savedThemeMode = localStorage.getItem('theme-mode') as 'light' | 'dark' | null;
      const initialThemeMode = savedThemeMode || systemPreference;
      
      setTheme(initialThemeMode);
      
      // Apply default theme initially (will be updated when profile loads)
      applyTheme(initialThemeMode, null);

      // Check for existing user session
      supabase.auth.getSession().then(async ({ data: { session }, error }) => {
        if (error) {
          console.error('Error getting session:', error);
        } else {
          setUser(session?.user ?? null);
          // Fetch profile if user is logged in
          if (session?.user) {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
            // Apply user's theme preferences
            applyTheme(initialThemeMode, profileData);
          } else {
            setProfile(null);
          }
        }
      });

      // Listen for authentication state changes (login, logout, etc.)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: Session | null) => {
        setUser(session?.user ?? null);
        // Fetch profile when auth state changes
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
          // Apply user's theme preferences
          applyTheme(theme, profileData);
        } else {
          setProfile(null);
          // Apply default theme when logged out
          applyTheme(theme, null);
        }
      });

      // Listen for system theme preference changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        // Only auto-switch if user hasn't manually set a preference
        const savedThemeMode = localStorage.getItem('theme-mode');
        if (!savedThemeMode) {
          const newMode = e.matches ? 'dark' : 'light';
          setTheme(newMode);
          // Get current profile from state
          supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user) {
              const profileData = await fetchProfile(session.user.id);
              applyTheme(newMode, profileData);
            } else {
              applyTheme(newMode, null);
            }
          });
        }
      };
      mediaQuery.addEventListener('change', handleSystemThemeChange);

      // Listen for profile update events (dispatched from profile page)
      const handleProfileUpdate = async () => {
        // Get current user from session to avoid stale closure
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
          // Apply updated theme preferences
          applyTheme(theme, profileData);
        }
      };

      window.addEventListener('profileAvatarUpdated', handleProfileUpdate);
      window.addEventListener('profileUpdated', handleProfileUpdate);

      // Cleanup: unsubscribe from auth state changes and remove event listener
      return () => {
        subscription.unsubscribe();
        window.removeEventListener('profileAvatarUpdated', handleProfileUpdate);
        window.removeEventListener('profileUpdated', handleProfileUpdate);
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      };
    } catch (error) {
      console.error('Error initializing header:', error);
    }
  }, [supabase]);

  /**
   * Update favicon based on current theme mode
   */
  const updateFavicon = (currentThemeMode: 'light' | 'dark') => {
    try {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = currentThemeMode === 'dark' ? '/favicon_dark.ico' : '/favicon_light.ico';
    } catch (error) {
      console.error('Error updating favicon:', error);
    }
  };

  /**
   * Update favicon when theme mode changes
   */
  useEffect(() => {
    updateFavicon(theme);
  }, [theme]);

  /**
   * Apply theme when profile or theme mode changes
   */
  useEffect(() => {
    applyTheme(theme, profile);
  }, [theme, profile]);

  /**
   * Toggle between light and dark theme mode
   * Saves preference to localStorage for persistence
   */
  const toggleTheme = () => {
    try {
      const newThemeMode = theme === 'light' ? 'dark' : 'light';
      setTheme(newThemeMode);
      localStorage.setItem('theme-mode', newThemeMode);
      applyTheme(newThemeMode, profile);
      updateFavicon(newThemeMode);
    } catch (error) {
      console.error('Error toggling theme:', error);
    }
  };

  return (
    <header className="navbar bg-base-100 shadow-lg border-b border-base-300 sticky top-0 z-50">
      <div className="container mx-auto flex items-center">
        <div className="flex-1 flex items-center">
          <Link href="/" className="btn btn-ghost normal-case text-xl typewriter px-0 flex items-center">
            <div className="logo-colorized mr-2 w-9 h-9 sm:w-10 sm:h-10">
              <Image
                src="/logo.png"
                alt="Recipe Almanac"
                width={40}
                height={40}
                className="w-full h-full"
              />
            </div>
            <span className="special-elite-regular text-[0.8em] lg:text-xl mr-0 pr-0 text-base-content">Recipe Almanac</span>
          </Link>
        </div>
        
        <div className="flex-none gap-2 flex items-center">
          {/* Profile Icon / Login Button */}
          {user ? (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
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
                  <Link href="/profile" className="block">Profile</Link>
                </li>
                <li>
                  <Link href="/almanac" className="block">My Almanac</Link>
                </li>
                <li>
                  <Link href="/recipe/create" className="block">Create Recipe</Link>
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
            <Link href="/login" className="btn btn-primary">
              Log In
            </Link>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-circle"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
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
        </div>
      </div>
    </header>
  );
}

