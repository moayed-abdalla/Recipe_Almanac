'use client';

import { createContext, useContext } from 'react';

/**
 * Shared coordination between the inline step timers and the recipe page.
 *
 * - `muted` / `toggleMute` drive the chime mute preference (persisted by the
 *   page in localStorage under `recipe-timer-muted`).
 * - `setTimerRunning` lets each inline timer report whether it is actively
 *   counting down, so the page can manage the Wake Lock across every timer.
 */
export interface RecipeTimerContextValue {
  muted: boolean;
  toggleMute: () => void;
  setTimerRunning: (id: string, running: boolean) => void;
}

const noop = () => {};

const defaultValue: RecipeTimerContextValue = {
  muted: false,
  toggleMute: noop,
  setTimerRunning: noop,
};

export const RecipeTimerContext = createContext<RecipeTimerContextValue>(defaultValue);

export function useRecipeTimer(): RecipeTimerContextValue {
  return useContext(RecipeTimerContext);
}
