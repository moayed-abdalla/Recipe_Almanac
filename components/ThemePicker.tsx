'use client';

import { UNIFIED_THEMES, type ThemeId } from '@/lib/theme-config';

interface ThemePickerProps {
  selectedTheme: ThemeId;
  onSelect: (themeId: ThemeId) => void;
}

/**
 * Compact theme picker shared between the registration and edit-profile pages.
 *
 * Renders 12 theme buttons in a responsive grid. Each button shows a split
 * circular swatch — top half is the light anchor colour, bottom half is the
 * dark anchor colour — so the user can see what the theme looks like in both
 * modes before choosing.
 *
 * Selecting a theme applies a live preview (via the `onSelect` callback) but
 * does NOT force a light/dark mode switch; the current mode is preserved.
 */
export default function ThemePicker({ selectedTheme, onSelect }: ThemePickerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
      {UNIFIED_THEMES.map((theme) => {
        const isSelected = selectedTheme === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => onSelect(theme.id)}
            className={`flex flex-col items-center gap-1.5 p-1.5 rounded-lg border-2 transition-all w-full ${
              isSelected
                ? 'border-primary bg-primary/10'
                : 'border-base-300 hover:border-primary/50'
            }`}
            aria-pressed={isSelected}
            aria-label={`${theme.name} theme${isSelected ? ' (selected)' : ''}`}
          >
            {/* Split swatch: top = light anchor, bottom = dark anchor */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-base-content/20 shadow-sm flex-shrink-0">
              <div className="w-full h-full flex flex-col">
                <div className="w-full h-1/2" style={{ backgroundColor: theme.lightAnchor }} />
                <div className="w-full h-1/2" style={{ backgroundColor: theme.darkAnchor }} />
              </div>
            </div>
            <span className="text-xs font-medium text-center leading-tight line-clamp-2">
              {theme.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
