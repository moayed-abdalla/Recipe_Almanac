'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { useProfileContext } from '@/contexts/ProfileContext';
import TutorialOverlay, { type TutorialStep } from './TutorialOverlay';

/**
 * One-time guided tour shown on the home page to logged-in users who have not
 * seen it. Dismissal/completion is persisted per-user via
 * profiles.has_seen_home_tutorial.
 */
export default function HomeTutorial() {
  const { user, profile, loading, refreshProfile } = useProfileContext();
  const savingRef = useRef(false);

  const shouldShow =
    !loading &&
    !!user &&
    !!profile &&
    profile.has_seen_home_tutorial === false;

  const [dismissed, setDismissed] = useState(false);

  const handleFinish = useCallback(async () => {
    setDismissed(true);
    if (!user || savingRef.current) return;
    savingRef.current = true;
    try {
      await supabaseClient
        .from('profiles')
        .update({ has_seen_home_tutorial: true })
        .eq('id', user.id);
      await refreshProfile();
    } catch (err) {
      console.error('Failed to save home tutorial state:', err);
    }
  }, [user, refreshProfile]);

  const steps = useMemo<TutorialStep[]>(
    () => [
      {
        selectors: ['[data-tour="profile"]', '[data-tour="profile-menu"]'],
        title: 'Your menu lives here',
        body: 'Tap your photo to open your menu — your profile, almanac, and creating or importing recipes.',
        onEnter: () => {
          (document.querySelector('[data-tour="profile"]') as HTMLElement | null)?.focus();
        },
      },
      {
        selectors: ['[data-tour="leaderboard"]'],
        title: 'Leaderboard',
        body: 'See the best-performing recipes the community loves.',
        onEnter: () => {
          (document.activeElement as HTMLElement | null)?.blur();
        },
      },
      {
        selectors: ['[data-tour="feed"]'],
        title: 'Your feed',
        body: 'Recipes tailored to your favourites and reviews show up here.',
      },
      {
        selectors: ['[data-tour="search"]'],
        title: 'Find something to cook',
        body: 'Search for any recipe and enjoy!',
      },
    ],
    []
  );

  if (!shouldShow || dismissed) return null;

  return <TutorialOverlay steps={steps} onFinish={handleFinish} />;
}
