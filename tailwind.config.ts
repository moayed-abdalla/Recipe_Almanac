import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'typewriter': ['Courier Prime', 'Special Elite', 'monospace'],
      },
      colors: {
        // Light mode color palette
        'lg-bg': '#E6C59E',
        'lg-secondary': '#F2E2CE',
        'lg-font': '#191510',
        'lg-light-accent': '#d7d9ea',
        'lg-dark-accent': '#0e101b',
        // Dark mode color palette
        'dk-bg': '#0E101B',
        'dk-secondary': '#353745',
        'dk-font': '#d7d9ea',
        'dk-light-accent': '#F2E2CE',
        'dk-dark-accent': '#E6C59E',
        // Steampunk/Alchemist accents
        'brass': '#D4AF37',
        'copper': '#B87333',
        'bronze': '#8B7355',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        light: {
          'base-100': '#E6C59E', // lg_bg
          'base-200': '#F2E2CE', // lg_secondary
          'base-content': '#191510', // lg_font
          'primary': '#0e101b', // lg_dark_accent
          'secondary': '#d7d9ea', // lg_light_accent
          'accent': '#0e101b',
          'neutral': '#191510',
        },
        dark: {
          'base-100': '#0E101B', // dk_bg
          'base-200': '#353745', // dk_secondary
          'base-content': '#d7d9ea', // dk_font
          'primary': '#E6C59E', // dk_dark_accent
          'secondary': '#F2E2CE', // dk_light_accent
          'accent': '#E6C59E',
          'neutral': '#353745',
        },
      },
    ],
    darkTheme: 'dark',
    base: true,
    styled: true,
    utils: true,
    prefix: '',
    logs: true,
    themeRoot: ':root',
  },
};

export default config;

