'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { useProfileContext } from '@/contexts/ProfileContext';
import TutorialOverlay, { type TutorialStep } from './TutorialOverlay';

/**
 * One-time guided tour shown on a recipe page to logged-in users who have not
 * seen it. Dismissal/completion is persisted per-user via
 * profiles.has_seen_recipe_tutorial.
 */
export default function RecipeTutorial() {
  const { user, profile, loading, refreshProfile } = useProfileContext();
  const savingRef = useRef(false);

  const shouldShow =
    !loading &&
    !!user &&
    !!profile &&
    profile.has_seen_recipe_tutorial === false;

  const [dismissed, setDismissed] = useState(false);

  const handleFinish = useCallback(async () => {
    setDismissed(true);
    if (!user || savingRef.current) return;
    savingRef.current = true;
    try {
      await supabaseClient
        .from('profiles')
        .update({ has_seen_recipe_tutorial: true })
        .eq('id', user.id);
      await refreshProfile();
    } catch (err) {
      console.error('Failed to save recipe tutorial state:', err);
    }
  }, [user, refreshProfile]);

  const steps = useMemo<TutorialStep[]>(
    () => [
      {
        selectors: ['[data-tour="wakelock"]'],
        title: 'Keep the screen awake',
        body: 'Stops your screen from dimming or locking while you cook.',
      },
      {
        selectors: ['[data-tour="mute"]'],
        title: 'Mute timers',
        body: 'Silences the chime for the on-page step timers.',
      },
      {
        selectors: ['[data-tour="fork"]'],
        title: 'Make it your own',
        body: 'Copy this recipe so you can tweak it however you like.',
      },
      {
        selectors: ['[data-tour="print"]'],
        title: 'Print',
        body: 'Get a clean, printable version of the recipe.',
      },
      {
        selectors: ['[data-tour="favorite"]'],
        title: 'Save it',
        body: 'Add the recipe to your favourites for later.',
      },
      {
        selectors: ['[data-tour="multiplier"]'],
        title: 'Scale the recipe',
        body: 'Adjust the multiplier to cook more or fewer servings.',
      },
      {
        selectors: ['[data-tour="units"]'],
        title: 'Convert units',
        body: 'Switch each ingredient to the units you prefer. Enjoy!',
      },
    ],
    []
  );

  if (!shouldShow || dismissed) return null;

  return <TutorialOverlay steps={steps} onFinish={handleFinish} />;
}
