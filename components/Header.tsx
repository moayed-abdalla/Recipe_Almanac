/**
 * Header Component
 * 
 * Global navigation header that appears on all pages.
 * Features:
 * - Site logo and title (links to homepage)
 * - User profile dropdown (when logged in) with:
 *   - My Profile link
 *   - My Almanac link
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
import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import type { Session } from '@supabase/supabase-js';

export default function Header() {
  // Theme state - controls light/dark mode
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // User state - current authenticated user
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: { username?: string; avatar_url?: string } } | null>(null);
  
  // Supabase client for authentication
  const supabase = supabaseClient;

  /**
   * Initialize theme and user session on component mount
   */
  useEffect(() => {
    try {
      // Get initial theme from localStorage, default to light mode
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      const initialTheme = savedTheme || 'light';
      setTheme(initialTheme);
      document.documentElement.setAttribute('data-theme', initialTheme);

      // Check for existing user session
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          console.error('Error getting session:', error);
        } else {
          setUser(session?.user ?? null);
        }
      });

      // Listen for authentication state changes (login, logout, etc.)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
        setUser(session?.user ?? null);
      });

      // Cleanup: unsubscribe from auth state changes when component unmounts
      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error initializing header:', error);
    }
  }, [supabase]);

  /**
   * Toggle between light and dark theme
   * Saves preference to localStorage for persistence
   */
  const toggleTheme = () => {
    try {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      localStorage.setItem('theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    } catch (error) {
      console.error('Error toggling theme:', error);
    }
  };

  return (
    <header className="navbar bg-base-100 shadow-lg border-b border-base-300">
      <div className="container mx-auto">
        <div className="flex-1">
          <Link href="/" className="btn btn-ghost normal-case text-xl typewriter">
            <Image
              src="/logo.png"
              alt="Recipe Almanac"
              width={40}
              height={40}
              className="mr-2"
            />
            <span className="special-elite-regular">Recipe Almanac</span>
          </Link>
        </div>
        
        <div className="flex-none gap-2 items-center">
          {/* Profile Icon / Login Button */}
          {user ? (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
                <div className="w-10 rounded-full bg-base-300">
                  {user.user_metadata?.avatar_url ? (
                    <Image
                      src={user.user_metadata.avatar_url}
                      alt="Profile"
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-base-300 flex items-center justify-center">
                      <span className="text-xs font-bold">
                        {user.user_metadata?.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
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
                  <Link href="/profile" className="block">My Profile</Link>
                </li>
                <li>
                  <Link href="/almanac" className="block">My Almanac</Link>
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

