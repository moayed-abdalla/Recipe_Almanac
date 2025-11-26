'use client';

import Link from 'next/link';
import { supabaseClient } from '@/lib/supabase-client';
import { useEffect, useState } from 'react';

export default function Footer() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <footer className="footer bg-base-200 p-10 text-base-content border-t-2 border-base-300">
      <div className="container mx-auto">
        <div className="footer-content flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <span className="text-xl font-bold">Recipe Almanac</span>
            </Link>
          </div>
          
          <nav className="flex items-center gap-4">
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
              className="btn btn-ghost btn-circle"
              aria-label="Buy Me a Coffee"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 3v1H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-2V3c0-.55-.45-1-1-1H7c-.55 0-1 .45-1 1zm1 0h10v1H7V3zM4 6h14v12H4V6zm2 2v8h10V8H6zm2 2h6v4H8v-4z"/>
                <path d="M18 19h2v1h-2z" opacity="0.3"/>
              </svg>
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

