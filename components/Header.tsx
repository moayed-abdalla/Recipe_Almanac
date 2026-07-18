/**
 * Header Component
 *
 * Global navigation header that appears on all pages.
 * - sm+: icon/label bar with profile dropdown
 * - below sm: logo + hamburger drawer (Feed, Leaderboard, theme, account)
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useCallback, useId, useRef } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { useProfileContext } from '@/contexts/ProfileContext';
import { useTheme } from '@/contexts/ThemeContext';

function FeedIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden
    >
      <path d="M12 12 L19.66 5.57 A10 10 0 1 0 19.66 18.43 Z M13.2 7.5 A1.2 1.2 0 1 0 10.8 7.5 A1.2 1.2 0 1 0 13.2 7.5 Z" />
    </svg>
  );
}

function ThemeIcon({ mode }: { mode: string }) {
  if (mode === 'light') {
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function Header() {
  const { user, profile } = useProfileContext();
  const { mode, toggleMode } = useTheme();
  const [isOffline, setIsOffline] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuPanelRef = useRef<HTMLDivElement>(null);

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

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus first focusable in the panel
    const panel = menuPanelRef.current;
    const focusable = panel?.querySelector<HTMLElement>(
      'a[href], button:not([disabled])'
    );
    focusable?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [menuOpen, closeMenu]);

  // Close drawer when resizing up to desktop nav
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const onChange = () => {
      if (mq.matches) setMenuOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const avatarInitial =
    profile?.username?.charAt(0).toUpperCase() ||
    user?.user_metadata?.username?.charAt(0).toUpperCase() ||
    user?.email?.charAt(0).toUpperCase() ||
    'U';

  return (
    <header className="site-header navbar bg-base-100 shadow-lg border-b border-base-300 sticky top-0 z-50 min-h-14 h-auto py-1 px-3 sm:px-4 pt-[max(0.25rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 min-h-0">
        <div className="flex-1 flex items-center min-w-0">
          <Link
            href="/"
            className="header-brand btn btn-ghost normal-case px-1 sm:px-2 flex items-center gap-1.5 sm:gap-2 min-w-0"
            onClick={closeMenu}
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
            <span className="typewriter text-base-content text-sm sm:text-base lg:text-xl whitespace-nowrap truncate max-w-[9.5rem] sm:max-w-none">
              Recipe Almanac
            </span>
          </Link>
        </div>

        {/* Offline badge — always in the sticky bar */}
        {isOffline && (
          <span
            className="badge badge-warning badge-sm sm:badge-md gap-1 font-semibold shrink-0"
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

        {/* Desktop / tablet nav (sm+) */}
        <div className="hidden sm:flex flex-none gap-1 sm:gap-2 items-center shrink-0">
          {user && (
            <Link
              href="/feed"
              data-tour="feed"
              className="btn btn-ghost rounded-btn px-4"
              aria-label="Feed"
            >
              <FeedIcon className="w-5 h-5 shrink-0" />
              <span>Feed</span>
            </Link>
          )}
          <Link
            href="/leaderboard"
            data-tour="leaderboard"
            className="btn btn-ghost rounded-btn px-4"
            aria-label="Leaderboard"
          >
            <span
              className="leaderboard-icon-mask inline-block w-5 h-5 shrink-0"
              aria-hidden
            />
            <span>Leaderboard</span>
          </Link>
          <button
            type="button"
            onClick={toggleMode}
            className="btn btn-ghost btn-circle"
            aria-label="Toggle theme"
          >
            <ThemeIcon mode={mode} />
          </button>

          {user ? (
            <div className="dropdown dropdown-end">
              <label
                tabIndex={0}
                data-tour="profile"
                className="btn btn-ghost btn-circle avatar"
              >
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
                        {avatarInitial}
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
                  const target = e.target as HTMLElement;
                  if (target.closest('a') || target.closest('button')) {
                    setTimeout(() => {
                      const dropdown = document.activeElement as HTMLElement;
                      dropdown?.blur?.();
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
                  <button type="button" onClick={handleSignOut}>
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

        {/* Mobile hamburger */}
        <button
          type="button"
          data-tour="nav-menu-button"
          className="btn btn-ghost btn-circle sm:hidden shrink-0 min-h-10 min-w-10"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="sm:hidden fixed inset-0 z-[60]" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 border-0 cursor-default"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <div
            ref={menuPanelRef}
            id={menuId}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute top-0 right-0 h-full w-[min(100%,20rem)] bg-base-100 shadow-xl border-l border-base-300 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
              <span className="font-semibold text-base">Menu</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="Close menu"
                onClick={closeMenu}
              >
                ✕
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3">
              <ul className="menu menu-md gap-1 w-full">
                {user && (
                  <li>
                    <Link href="/feed" data-tour="feed" onClick={closeMenu}>
                      <FeedIcon className="w-5 h-5 shrink-0" />
                      Feed
                    </Link>
                  </li>
                )}
                <li>
                  <Link href="/leaderboard" data-tour="leaderboard" onClick={closeMenu}>
                    <span
                      className="leaderboard-icon-mask inline-block w-5 h-5 shrink-0"
                      aria-hidden
                    />
                    Leaderboard
                  </Link>
                </li>
                <li>
                  <button type="button" onClick={toggleMode} className="justify-start">
                    <ThemeIcon mode={mode} />
                    {mode === 'light' ? 'Dark mode' : 'Light mode'}
                  </button>
                </li>
              </ul>

              <div className="divider my-2" />

              {user ? (
                <div data-tour="profile-menu">
                  <div
                    data-tour="profile"
                    className="flex items-center gap-3 px-3 py-2 mb-1"
                  >
                    <div className="w-10 h-10 rounded-full bg-base-300 overflow-hidden shrink-0">
                      {profile?.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt=""
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-sm font-bold">{avatarInitial}</span>
                        </div>
                      )}
                    </div>
                    <span className="font-medium truncate min-w-0">
                      {profile?.username || 'Account'}
                    </span>
                  </div>
                  <ul className="menu menu-md gap-1 w-full">
                    <li>
                      <Link href="/profile" onClick={closeMenu}>
                        Profile
                      </Link>
                    </li>
                    <li>
                      <Link href="/almanac" onClick={closeMenu}>
                        My Almanac
                      </Link>
                    </li>
                    <li>
                      <Link href="/recipe/create" onClick={closeMenu}>
                        Create Recipe
                      </Link>
                    </li>
                    <li>
                      <Link href="/recipe/import" onClick={closeMenu}>
                        Import Recipe
                      </Link>
                    </li>
                    <li>
                      <button type="button" onClick={handleSignOut}>
                        Logout
                      </button>
                    </li>
                  </ul>
                </div>
              ) : (
                <div className="px-2">
                  <Link
                    href="/login"
                    className="btn btn-primary w-full"
                    onClick={closeMenu}
                  >
                    Log In
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
