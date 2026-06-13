/**
 * Unified Theme Configuration
 *
 * Each of the 12 themes has a light variant and a dark variant.
 * The user picks one theme; the header toggle switches between its light/dark modes.
 *
 * EDITING COLORS
 * --------------
 * Every theme is a plain object — just change the hex codes directly.
 * `lightAnchor` / `darkAnchor` are the primary brand colors shown in swatches.
 * `accent.light` / `accent.dark` are the pop color used as the DaisyUI accent token.
 * `light.colors` / `dark.colors` hold the full DaisyUI token set.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ThemeId =
  | 'tangerine'
  | 'salt-pepper'
  | 'ice'
  | 'coffee'
  | 'cherry'
  | 'grape'
  | 'banana'
  | 'olive'
  | 'mojito'
  | 'pb-j'
  | 'watermelon'
  | 'avocado';

export interface ThemeColors {
  'base-100': string;
  'base-200': string;
  'base-300': string;
  'base-content': string;
  'primary': string;
  'primary-content': string;
  'secondary': string;
  'accent': string;
  'neutral': string;
}

/** A single light-or-dark variant as stored in the DaisyUI theme map. */
export interface ThemeDefinition {
  /** Composite DaisyUI key, e.g. 'tangerine-light' */
  id: string;
  /** Human-readable name shown in UI */
  name: string;
  mode: 'light' | 'dark';
  /** Parent unified theme ID */
  unifiedId: ThemeId;
  colors: ThemeColors;
  /** First swatch half (always the light anchor) */
  color1: string;
  /** Second swatch half (always the dark anchor) */
  color2: string;
}

/** Both variants for one theme, plus the raw anchor/accent values for easy editing. */
export interface UnifiedThemeDefinition {
  id: ThemeId;
  name: string;
  /** The light-mode brand color (top-half swatch) */
  lightAnchor: string;
  /** The dark-mode brand color (bottom-half swatch) */
  darkAnchor: string;
  /** Pop/accent colors — change these to adjust accent highlights */
  accent: { light: string; dark: string };
  /** Image colorization color per mode (used for kitchen-icon masks) */
  imageColor: { light: string; dark: string };
  /** Background-icon opacity per mode */
  bgOpacity: { light: number; dark: number };
  light: ThemeDefinition;
  dark: ThemeDefinition;
}

// ---------------------------------------------------------------------------
// 12 Unified Theme Definitions
// ---------------------------------------------------------------------------

const buildVariant = (
  id: ThemeId,
  name: string,
  mode: 'light' | 'dark',
  lightAnchor: string,
  darkAnchor: string,
  colors: ThemeColors
): ThemeDefinition => ({
  id: `${id}-${mode}`,
  name,
  mode,
  unifiedId: id,
  colors,
  color1: lightAnchor,
  color2: darkAnchor,
});

export const UNIFIED_THEMES: UnifiedThemeDefinition[] = [

  // ── Tangerine ──────────────────────────────────────────────────────────────
  (() => {
    const id: ThemeId = 'tangerine';
    const name = 'Tangerine';
    const la = '#ff6f08';
    const da = '#ff6f08';
    const accent = { light: '#87CEEB', dark: '#87CEEB' };
    return {
      id, name,
      lightAnchor: la, darkAnchor: da, accent,
      imageColor: { light: '#ff6f08', dark: '#FF6F08' },
      bgOpacity: { light: 0.15, dark: 0.20 },
      light: buildVariant(id, name, 'light', la, da, {
        'base-100': '#F7F7F7',
        'base-200': '#EEEEEE',
        'base-300': '#E0E0E0',
        'base-content': '#CC4A00',
        'primary': '#FF6F08',
        'primary-content': '#FFFFFF',
        'secondary': '#ff6f08',
        'accent': accent.light,
        'neutral': '#808080',
      }),
      dark: buildVariant(id, name, 'dark', la, da, {
        'base-100': '#1A1A1A',
        'base-200': '#2D2D2D',
        'base-300': '#404040',
        'base-content': '#FF9940',
        'primary': '#FF6F08',
        'primary-content': '#1A1A1A',
        'secondary': '#ff6f08',
        'accent': accent.dark,
        'neutral': '#666666',
      }),
    };
  })(),

  // ── Salt & Pepper ──────────────────────────────────────────────────────────
  (() => {
    const id: ThemeId = 'salt-pepper';
    const name = 'Salt & Pepper';
    const la = '#e7e7e7';
    const da = '#2a2a2a';
    const accent = { light: '#6B7280', dark: '#9CA3AF' };
    return {
      id, name,
      lightAnchor: la, darkAnchor: da, accent,
      imageColor: { light: '#3D3D3D', dark: '#C0C0C0' },
      bgOpacity: { light: 0.12, dark: 0.18 },
      light: buildVariant(id, name, 'light', la, da, {
        'base-100': '#F0F0F0',
        'base-200': '#E0E0E0',
        'base-300': '#C8C8C8',
        'base-content': '#1A1A1A',
        'primary': '#2A2A2A',
        'primary-content': '#FFFFFF',
        'secondary': '#555555',
        'accent': accent.light,
        'neutral': '#9CA3AF',
      }),
      dark: buildVariant(id, name, 'dark', la, da, {
        'base-100': '#1C1C1C',
        'base-200': '#2A2A2A',
        'base-300': '#383838',
        'base-content': '#E7E7E7',
        'primary': '#D4D4D4',
        'primary-content': '#1A1A1A',
        'secondary': '#9CA3AF',
        'accent': accent.dark,
        'neutral': '#666666',
      }),
    };
  })(),

  // ── Ice ───────────────────────────────────────────────────────────────────
  (() => {
    const id: ThemeId = 'ice';
    const name = 'Ice';
    const la = '#000536';
    const da = '#a1cbff';
    const accent = { light: '#FFB347', dark: '#4A90D9' };
    return {
      id, name,
      lightAnchor: la, darkAnchor: da, accent,
      imageColor: { light: '#000536', dark: '#A1CBFF' },
      bgOpacity: { light: 0.12, dark: 0.18 },
      light: buildVariant(id, name, 'light', la, da, {
        'base-100': '#EEF2FF',
        'base-200': '#DDE6FF',
        'base-300': '#C5D8FF',
        'base-content': '#000536',
        'primary': '#000536',
        'primary-content': '#FFFFFF',
        'secondary': '#1A3A7A',
        'accent': accent.light,
        'neutral': '#4A5568',
      }),
      dark: buildVariant(id, name, 'dark', la, da, {
        'base-100': '#000A2E',
        'base-200': '#001050',
        'base-300': '#002080',
        'base-content': '#A1CBFF',
        'primary': '#A1CBFF',
        'primary-content': '#000536',
        'secondary': '#7AB3F0',
        'accent': accent.dark,
        'neutral': '#334E7A',
      }),
    };
  })(),

  // ── Coffee ────────────────────────────────────────────────────────────────
  (() => {
    const id: ThemeId = 'coffee';
    const name = 'Coffee';
    const la = '#c6a98c';
    const da = '#402517';
    const accent = { light: '#D4A017', dark: '#A1887F' };
    return {
      id, name,
      lightAnchor: la, darkAnchor: da, accent,
      imageColor: { light: '#7A4A30', dark: '#C6A98C' },
      bgOpacity: { light: 0.15, dark: 0.20 },
      light: buildVariant(id, name, 'light', la, da, {
        'base-100': '#F5EDE5',
        'base-200': '#EAD9C8',
        'base-300': '#D4C4B0',
        'base-content': '#3D2010',
        'primary': '#8B5A3C',
        'primary-content': '#FFFFFF',
        'secondary': '#C6A98C',
        'accent': accent.light,
        'neutral': '#8D6E63',
      }),
      dark: buildVariant(id, name, 'dark', la, da, {
        'base-100': '#2A1810',
        'base-200': '#3D2010',
        'base-300': '#5A3228',
        'base-content': '#C6A98C',
        'primary': '#C6A98C',
        'primary-content': '#2A1810',
        'secondary': '#A1887F',
        'accent': accent.dark,
        'neutral': '#7D5A50',
      }),
    };
  })(),

  // ── Cherry ────────────────────────────────────────────────────────────────
  (() => {
    const id: ThemeId = 'cherry';
    const name = 'Cherry';
    const la = '#ffabab';
    const da = '#380000';
    const accent = { light: '#C0392B', dark: '#FF6B6B' };
    return {
      id, name,
      lightAnchor: la, darkAnchor: da, accent,
      imageColor: { light: '#380000', dark: '#ffabab' },
      bgOpacity: { light: 0.15, dark: 0.20 },
      light: buildVariant(id, name, 'light', la, da, {
        'base-100': '#FFF0F0',
        'base-200': '#FFE0E0',
        'base-300': '#FFC8C8',
        'base-content': '#380000',
        'primary': '#B22222',
        'primary-content': '#FFFFFF',
        'secondary': '#FFABAB',
        'accent': accent.light,
        'neutral': '#9E6B6B',
      }),
      dark: buildVariant(id, name, 'dark', la, da, {
        'base-100': '#220000',
        'base-200': '#380000',
        'base-300': '#4D0000',
        'base-content': '#FFABAB',
        'primary': '#FF6B6B',
        'primary-content': '#220000',
        'secondary': '#FFABAB',
        'accent': accent.dark,
        'neutral': '#8B5A5A',
      }),
    };
  })(),

  // ── Grape ─────────────────────────────────────────────────────────────────
  (() => {
    const id: ThemeId = 'grape';
    const name = 'Grape';
    const la = '#240039';
    const da = '#cc96ff';
    const accent = { light: '#E879F9', dark: '#9B59B6' };
    return {
      id, name,
      lightAnchor: la, darkAnchor: da, accent,
      imageColor: { light: '#5B21B6', dark: '#CC96FF' },
      bgOpacity: { light: 0.12, dark: 0.20 },
      light: buildVariant(id, name, 'light', la, da, {
        'base-100': '#F5EEFF',
        'base-200': '#EBDEFF',
        'base-300': '#D8C3FF',
        'base-content': '#240039',
        'primary': '#6B21A8',
        'primary-content': '#FFFFFF',
        'secondary': '#9B59B6',
        'accent': accent.light,
        'neutral': '#6B7280',
      }),
      dark: buildVariant(id, name, 'dark', la, da, {
        'base-100': '#150023',
        'base-200': '#240039',
        'base-300': '#36005A',
        'base-content': '#CC96FF',
        'primary': '#CC96FF',
        'primary-content': '#240039',
        'secondary': '#A855F7',
        'accent': accent.dark,
        'neutral': '#7C3AED',
      }),
    };
  })(),

  // ── Banana ────────────────────────────────────────────────────────────────
  (() => {
    const id: ThemeId = 'banana';
    const name = 'Banana';
    const la = '#fbeb61';
    const da = '#2d1200';
    const accent = { light: '#FF9500', dark: '#FFE066' };
    return {
      id, name,
      lightAnchor: la, darkAnchor: da, accent,
      imageColor: { light: '#B8860B', dark: '#FBEB61' },
      bgOpacity: { light: 0.15, dark: 0.20 },
      light: buildVariant(id, name, 'light', la, da, {
        'base-100': '#FFFCE8',
        'base-200': '#FFF8C0',
        'base-300': '#FFF099',
        'base-content': '#2D1200',
        'primary': '#B8860B',
        'primary-content': '#FFFFFF',
        'secondary': '#FBEB61',
        'accent': accent.light,
        'neutral': '#8B7355',
      }),
      dark: buildVariant(id, name, 'dark', la, da, {
        'base-100': '#1A0B00',
        'base-200': '#2D1200',
        'base-300': '#4A1F00',
        'base-content': '#FBEB61',
        'primary': '#FBEB61',
        'primary-content': '#2D1200',
        'secondary': '#FFD700',
        'accent': accent.dark,
        'neutral': '#8B6914',
      }),
    };
  })(),

  // ── Olive ─────────────────────────────────────────────────────────────────
  (() => {
    const id: ThemeId = 'olive';
    const name = 'Olive';
    const la = '#78840b';
    const da = '#160326';
    const accent = { light: '#C4A747', dark: '#A8B832' };
    return {
      id, name,
      lightAnchor: la, darkAnchor: da, accent,
      imageColor: { light: '#78840B', dark: '#B8C214' },
      bgOpacity: { light: 0.15, dark: 0.20 },
      light: buildVariant(id, name, 'light', la, da, {
        'base-100': '#F5F3E8',
        'base-200': '#EBE7D0',
        'base-300': '#D9D4B0',
        'base-content': '#2A2800',
        'primary': '#78840B',
        'primary-content': '#FFFFFF',
        'secondary': '#9EA813',
        'accent': accent.light,
        'neutral': '#7C7A50',
      }),
      dark: buildVariant(id, name, 'dark', la, da, {
        'base-100': '#0C0215',
        'base-200': '#160326',
        'base-300': '#250540',
        'base-content': '#B8C214',
        'primary': '#9EA813',
        'primary-content': '#0C0215',
        'secondary': '#78840B',
        'accent': accent.dark,
        'neutral': '#5A6A0A',
      }),
    };
  })(),

  // ── Mojito ────────────────────────────────────────────────────────────────
  (() => {
    const id: ThemeId = 'mojito';
    const name = 'Mojito';
    const la = '#173700';
    const da = '#eaff00';
    const accent = { light: '#7CB518', dark: '#BFFF00' };
    return {
      id, name,
      lightAnchor: la, darkAnchor: da, accent,
      imageColor: { light: '#2D6B00', dark: '#BFFF00' },
      bgOpacity: { light: 0.15, dark: 0.20 },
      light: buildVariant(id, name, 'light', la, da, {
        'base-100': '#EDFAE8',
        'base-200': '#D5F0CC',
        'base-300': '#BAE5B0',
        'base-content': '#173700',
        'primary': '#2D6B00',
        'primary-content': '#FFFFFF',
        'secondary': '#4A9A00',
        'accent': accent.light,
        'neutral': '#4A7A4A',
      }),
      dark: buildVariant(id, name, 'dark', la, da, {
        'base-100': '#0B1D00',
        'base-200': '#173700',
        'base-300': '#235500',
        'base-content': '#EAFF00',
        'primary': '#BFFF00',
        'primary-content': '#0B1D00',
        'secondary': '#EAFF00',
        'accent': accent.dark,
        'neutral': '#3A6600',
      }),
    };
  })(),

  // ── PB&J ──────────────────────────────────────────────────────────────────
  (() => {
    const id: ThemeId = 'pb-j';
    const name = 'PB&J';
    const la = '#4e0034';
    const da = '#cd8358';
    const accent = { light: '#9B59B6', dark: '#E8B4B8' };
    return {
      id, name,
      lightAnchor: la, darkAnchor: da, accent,
      imageColor: { light: '#9B0068', dark: '#CD8358' },
      bgOpacity: { light: 0.15, dark: 0.20 },
      light: buildVariant(id, name, 'light', la, da, {
        'base-100': '#FFF0F8',
        'base-200': '#FFE0F0',
        'base-300': '#FFC8E5',
        'base-content': '#4E0034',
        'primary': '#9B0068',
        'primary-content': '#FFFFFF',
        'secondary': '#CD8358',
        'accent': accent.light,
        'neutral': '#8B5A7A',
      }),
      dark: buildVariant(id, name, 'dark', la, da, {
        'base-100': '#2A001C',
        'base-200': '#4E0034',
        'base-300': '#6B0047',
        'base-content': '#CD8358',
        'primary': '#CD8358',
        'primary-content': '#2A001C',
        'secondary': '#F0A070',
        'accent': accent.dark,
        'neutral': '#8B4535',
      }),
    };
  })(),

  // ── Watermelon ────────────────────────────────────────────────────────────
  (() => {
    const id: ThemeId = 'watermelon';
    const name = 'Watermelon';
    const la = '#00610d';
    const da = '#ff3e3e';
    const accent = { light: '#FF69B4', dark: '#00610d' };
    return {
      id, name,
      lightAnchor: la, darkAnchor: da, accent,
      imageColor: { light: '#00610D', dark: '#FF3E3E' },
      bgOpacity: { light: 0.15, dark: 0.20 },
      light: buildVariant(id, name, 'light', la, da, {
        'base-100': '#F0FFF2',
        'base-200': '#E0F5E5',
        'base-300': '#C8EBD0',
        'base-content': '#004009',
        'primary': '#00610D',
        'primary-content': '#FFFFFF',
        'secondary': '#2D8A3A',
        'accent': accent.light,
        'neutral': '#4A7A50',
      }),
      dark: buildVariant(id, name, 'dark', la, da, {
        'base-100': '#1A0000',
        'base-200': '#300000',
        'base-300': '#4A0000',
        'base-content': '#FF8080',
        'primary': '#FF3E3E',
        'primary-content': '#1A0000',
        'secondary': '#FF6868',
        'accent': accent.dark,
        'neutral': '#8B4A4A',
      }),
    };
  })(),

  // ── Avocado ───────────────────────────────────────────────────────────────
  (() => {
    const id: ThemeId = 'avocado';
    const name = 'Avocado';
    const la = '#7d9937';
    const da = '#432819';
    const accent = { light: '#F4D03F', dark: '#A5D152' };
    return {
      id, name,
      lightAnchor: la, darkAnchor: da, accent,
      imageColor: { light: '#7D9937', dark: '#A5C255' },
      bgOpacity: { light: 0.15, dark: 0.20 },
      light: buildVariant(id, name, 'light', la, da, {
        'base-100': '#F0F5E5',
        'base-200': '#E2EDD0',
        'base-300': '#CDE0B8',
        'base-content': '#2A1C08',
        'primary': '#7D9937',
        'primary-content': '#FFFFFF',
        'secondary': '#A5C255',
        'accent': accent.light,
        'neutral': '#7D7A5A',
      }),
      dark: buildVariant(id, name, 'dark', la, da, {
        'base-100': '#261508',
        'base-200': '#432819',
        'base-300': '#5E3D26',
        'base-content': '#A5C255',
        'primary': '#A5C255',
        'primary-content': '#261508',
        'secondary': '#7D9937',
        'accent': accent.dark,
        'neutral': '#6B5A3A',
      }),
    };
  })(),

];

// ---------------------------------------------------------------------------
// Flat exports for DaisyUI & legacy consumers
// ---------------------------------------------------------------------------

/** 24-entry flat list (12 light + 12 dark) — keyed by `themeId-mode` */
export const ALL_THEMES: ThemeDefinition[] = UNIFIED_THEMES.flatMap(t => [t.light, t.dark]);

export const DEFAULT_THEME: ThemeId = 'tangerine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve the DaisyUI theme ID for a given unified theme + mode. */
export function resolveDaisyThemeId(themeId: ThemeId, mode: 'light' | 'dark'): string {
  return `${themeId}-${mode}`;
}

/** Look up a flat ThemeDefinition by its DaisyUI composite ID (e.g. 'tangerine-light'). */
export function getThemeByDaisyId(daisyId: string): ThemeDefinition | undefined {
  return ALL_THEMES.find(t => t.id === daisyId);
}

/** Alias kept for backwards-compatibility with PDF/print consumers. */
export const getThemeById = getThemeByDaisyId;

/** Look up the full UnifiedThemeDefinition by ThemeId. */
export function getUnifiedTheme(id: ThemeId): UnifiedThemeDefinition | undefined {
  return UNIFIED_THEMES.find(t => t.id === id);
}

/**
 * Migrate old guest localStorage keys to the new single 'guest-theme' key.
 * Always returns 'tangerine' (the reset default) and clears old keys.
 */
export function migrateGuestThemePrefs(): ThemeId {
  try {
    const hasOldKeys =
      localStorage.getItem('guest-light-theme') ||
      localStorage.getItem('guest-dark-theme');
    if (hasOldKeys) {
      localStorage.removeItem('guest-light-theme');
      localStorage.removeItem('guest-dark-theme');
      localStorage.setItem('guest-theme', 'tangerine');
    }
  } catch {
    // localStorage unavailable (SSR or private browsing)
  }
  return 'tangerine';
}
