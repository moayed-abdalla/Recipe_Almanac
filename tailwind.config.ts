import type { Config } from 'tailwindcss';
import { ALL_THEMES } from './lib/theme-config';

// Convert theme definitions to DaisyUI format
const daisyThemes = ALL_THEMES.reduce((acc, theme) => {
  acc[theme.id] = theme.colors;
  return acc;
}, {} as Record<string, any>);

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'typewriter': ['Special Elite', 'system-ui', 'monospace'],
        'sans': ['Special Elite', 'system-ui', 'monospace'],
      },
      colors: {
        // Orange theme colors
        'orange-dark': '#CC5500',
        'orange-primary': '#FF8C00',
        'orange-secondary': '#FFA500',
        'blue-accent': '#87CEEB',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [daisyThemes],
    darkTheme: 'dark-orange', // Default dark theme
    base: true,
    styled: true,
    utils: true,
    prefix: '',
    logs: true,
    themeRoot: ':root',
  },
};

export default config;

