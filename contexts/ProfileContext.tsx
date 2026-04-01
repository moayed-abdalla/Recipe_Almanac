'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabase-client';
import type { Profile } from '@/types';

type ProfileContextValue = {
  user: User | null;
  profile: Profile | null;
  /** True until the first session + optional profile row resolve */
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchProfileRow = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data as Profile;
  }, []);

  const refreshProfile = useCallback(async () => {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    const u = session?.user ?? null;
    if (!u) {
      if (!mountedRef.current) return;
      setProfile(null);
      return;
    }
    const p = await fetchProfileRow(u.id);
    if (!mountedRef.current) return;
    setProfile(p);
  }, [fetchProfileRow]);

  useEffect(() => {
    const applySession = async (sessionUser: User | null) => {
      if (!mountedRef.current) return;
      setUser(sessionUser);
      if (sessionUser) {
        const p = await fetchProfileRow(sessionUser.id);
        if (!mountedRef.current) return;
        setProfile(p);
      } else {
        setProfile(null);
      }
      if (mountedRef.current) setLoading(false);
    };

    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      void applySession(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      void applySession(session?.user ?? null);
    });

    const onProfileEvent = () => {
      void refreshProfile();
    };
    window.addEventListener('profileAvatarUpdated', onProfileEvent);
    window.addEventListener('profileUpdated', onProfileEvent);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('profileAvatarUpdated', onProfileEvent);
      window.removeEventListener('profileUpdated', onProfileEvent);
    };
  }, [fetchProfileRow, refreshProfile]);

  const value = useMemo(
    () => ({ user, profile, loading, refreshProfile }),
    [user, profile, loading, refreshProfile]
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfileContext(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfileContext must be used within ProfileProvider');
  }
  return ctx;
}
