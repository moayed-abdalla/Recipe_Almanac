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
    themes: [
      {
        light: {
          'base-100': '#F7F7F7', // White main background
          'base-200': '#E8E8E8', // Light grey secondary
          'base-300': '#D3D3D3', // Medium grey
          'base-content': '#CC5500', // Dark orange text
          'primary': '#CC5500', // Orange primary
          'secondary': '#FFA500', // Orange secondary
          'accent': '#87CEEB', // Light blue accent
          'neutral': '#808080', // Grey neutral
        },
        dark: {
          'base-100': '#1A1A1A', // Dark background (inverse of white)
          'base-200': '#2D2D2D', // Dark grey secondary
          'base-300': '#404040', // Medium dark grey
          'base-content': '#FFA500', // Orange text (inverse of dark orange)
          'primary': '#FFA500', // Orange primary
          'secondary': '#FFA500', // Orange secondary
          'accent': '#87CEEB', // Light blue accent
          'neutral': '#666666', // Light grey neutral
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

