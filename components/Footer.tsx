'use client';

import Link from 'next/link';
import Image from 'next/image';
import { supabaseClient } from '@/lib/supabase-client';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

export default function Footer() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setUser(session?.user ?? null);
    });

    // Get initial theme from localStorage or document
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light';
    setTheme(initialTheme);

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      const currentTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | null;
      if (currentTheme) {
        setTheme(currentTheme);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => {
      subscription.unsubscribe();
      observer.disconnect();
    };
  }, []);

  return (
    <footer className="footer bg-base-100 p-10 text-base-content border-t border-base-300">
      <div className="container mx-auto">
        <div className="footer-content flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <span className="text-xl font-bold">Recipe Almanac</span>
            </Link>
          </div>
          
          <nav className="flex items-center gap-4">
            <Link href="/feedback" className="btn btn-sm btn-outline">
              Feedback
            </Link>
            {user && (
              <>
                <Link href="/profile" className="link link-hover">My Profile</Link>
                <Link href="/almanac" className="link link-hover">My Almanac</Link>
              </>
            )}
            <a
              href="https://github.com/moayed-abdalla/Recipe_Almanac/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-circle"
              aria-label="GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
            <a
              href="https://buymeacoffee.com/moayed_abdalla"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-circle hover:opacity-80 transition-opacity flex items-center justify-center"
              aria-label="Buy Me a Coffee"
            >
              <div className="w-6 h-6 relative flex items-center justify-center">
                {theme === 'light' ? (
                  <Image
                    src="/BuyMeACoffee_Light.png"
                    alt="Buy Me a Coffee"
                    fill
                    className="object-contain"
                    sizes="24px"
                  />
                ) : (
                  <Image
                    src="/BuyMeACoffee_Dark.png"
                    alt="Buy Me a Coffee"
                    fill
                    className="object-contain"
                    sizes="24px"
                  />
                )}
              </div>
            </a>
          </nav>
        </div>
        
        <div className="text-center mt-4 text-sm opacity-70">
          <p>© {new Date().getFullYear()} Recipe Almanac. No ads, no subscriptions, just recipes.</p>
        </div>
      </div>
    </footer>
  );
}

