/**
 * Authentication Hook
 * 
 * Custom hook for managing authentication state and user data.
 * Reduces code duplication across components that need auth state.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import type { Session, User } from '@supabase/supabase-js';

interface UseAuthOptions {
  /**
   * Whether to redirect to login if user is not authenticated
   * @default true
   */
  redirectToLogin?: boolean;
  
  /**
   * Whether to require authentication (will redirect if not authenticated)
   * @default false
   */
  requireAuth?: boolean;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for authentication state management
 * 
 * @param options - Configuration options
 * @returns Authentication state and utilities
 */
export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const {
    redirectToLogin = true,
    requireAuth = false,
  } = options;

  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setError(null);
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      
      if (userError) {
        console.error('Error fetching user:', userError);
        if (requireAuth && redirectToLogin) {
          router.push('/login');
        }
        setUser(null);
        return;
      }
      
      if (!user && requireAuth && redirectToLogin) {
        router.push('/login');
        return;
      }
      
      setUser(user);
    } catch (err) {
      console.error('Error in fetchUser:', err);
      setError('An unexpected error occurred');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();

    // Listen for authentication state changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (_event: string, session: Session | null) => {
        setUser(session?.user ?? null);
        
        if (!session?.user && requireAuth && redirectToLogin) {
          router.push('/login');
        }
      }
    );

    // Cleanup: unsubscribe from auth state changes
    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requireAuth, redirectToLogin]);

  return {
    user,
    loading,
    error,
    refetch: fetchUser,
  };
}
