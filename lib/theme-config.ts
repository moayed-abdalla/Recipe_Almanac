/**
 * Theme Configuration
 * 
 * Defines all available themes and their color schemes.
 * Themes are organized into light and dark categories.
 */

export type LightThemeId = 'light-orange' | 'light-grey' | 'light-beige' | 'light-coffee';
export type DarkThemeId = 'dark-orange' | 'dark-blue' | 'dark-red' | 'dark-purple';
export type ThemeId = LightThemeId | DarkThemeId;

export interface ThemeColors {
  'base-100': string;
  'base-200': string;
  'base-300': string;
  'base-content': string;
  'primary': string;
  'secondary': string;
  'accent': string;
  'neutral': string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  type: 'light' | 'dark';
  colors: ThemeColors;
  color1: string; // First main color for display
  color2: string; // Second main color for display
}

/**
 * Light Themes
 */
export const LIGHT_THEMES: ThemeDefinition[] = [
  {
    id: 'light-orange',
    name: 'Tangarine',
    type: 'light',
    colors: {
      'base-100': '#F7F7F7', // White main background
      'base-200': '#E8E8E8', // Light grey secondary
      'base-300': '#D3D3D3', // Medium grey
      'base-content': '#CC5500', // Dark orange text
      'primary': '#CC5500', // Orange primary
      'secondary': '#FFA500', // Orange secondary
      'accent': '#87CEEB', // Light blue accent
      'neutral': '#808080', // Grey neutral
    },
    color1: '#FF8C00', // Orange
    color2: '#FFFFFF', // White
  },
  {
    id: 'light-grey',
    name: 'Pepper',
    type: 'light',
    colors: {
      'base-100': '#FFFFFF', // White main background
      'base-200': '#F5F5F5', // Very light grey secondary
      'base-300': '#E0E0E0', // Light grey
      'base-content': '#424242', // Dark grey text
      'primary': '#616161', // Medium grey primary
      'secondary': '#9E9E9E', // Light grey secondary
      'accent': '#757575', // Grey accent
      'neutral': '#757575', // Grey neutral
    },
    color1: '#FFFFFF', // White
    color2: '#9E9E9E', // Grey
  },
  {
    id: 'light-beige',
    name: 'Lobster',
    type: 'light',
    colors: {
      'base-100': '#F5F5DC', // Beige main background
      'base-200': '#E8E8D3', // Light beige secondary
      'base-300': '#D3D3C0', // Medium beige
      'base-content': '#4A5568', // Dark blue-grey text
      'primary': '#4A5568', // Blue-grey primary
      'secondary': '#718096', // Medium blue-grey secondary
      'accent': '#4299E1', // Blue accent
      'neutral': '#718096', // Blue-grey neutral
    },
    color1: '#F5F5DC', // Beige
    color2: '#4299E1', // Blue
  },
  {
    id: 'light-coffee',
    name: 'Coffee',
    type: 'light',
    colors: {
      'base-100': '#F5E6D3', // Light beige main background
      'base-200': '#E8D5C0', // Medium beige secondary
      'base-300': '#D4C4B0', // Darker beige
      'base-content': '#5D4037', // Dark brown text
      'primary': '#6D4C41', // Brown primary
      'secondary': '#8D6E63', // Medium brown secondary
      'accent': '#A1887F', // Light brown accent
      'neutral': '#8D6E63', // Brown neutral
    },
    color1: '#F5E6D3', // Beige
    color2: '#6D4C41', // Brown
  },
];

/**
 * Dark Themes
 */
export const DARK_THEMES: ThemeDefinition[] = [
  {
    id: 'dark-orange',
    name: 'Lemon',
    type: 'dark',
    colors: {
      'base-100': '#1A1A1A', // Dark background (inverse of white)
      'base-200': '#2D2D2D', // Dark grey secondary
      'base-300': '#404040', // Medium dark grey
      'base-content': '#FFA500', // Orange text (inverse of dark orange)
      'primary': '#FFA500', // Orange primary
      'secondary': '#FFA500', // Orange secondary
      'accent': '#87CEEB', // Light blue accent
      'neutral': '#666666', // Light grey neutral
    },
    color1: '#FF8C00', // Light orange
    color2: '#000000', // Black
  },
  {
    id: 'dark-blue',
    name: 'Ice',
    type: 'dark',
    colors: {
      'base-100': '#2D3748', // Dark grey-blue background
      'base-200': '#1A202C', // Darker grey-blue secondary
      'base-300': '#4A5568', // Medium dark grey-blue
      'base-content': '#90CDF4', // Light blue text
      'primary': '#63B3ED', // Blue primary
      'secondary': '#4299E1', // Medium blue secondary
      'accent': '#3182CE', // Darker blue accent
      'neutral': '#718096', // Grey-blue neutral
    },
    color1: '#4299E1', // Blue
    color2: '#2D3748', // Dark grey
  },
  {
    id: 'dark-red',
    name: 'Tomato',
    type: 'dark',
    colors: {
      'base-100': '#1A1A1A', // Black background
      'base-200': '#2D1D1D', // Dark red-tinted secondary
      'base-300': '#401F1F', // Medium dark red-tinted
      'base-content': '#F56565', // Light red text
      'primary': '#FC8181', // Red primary
      'secondary': '#E53E3E', // Dark red secondary
      'accent': '#C53030', // Darker red accent
      'neutral': '#718096', // Grey neutral
    },
    color1: '#000000', // Black
    color2: '#E53E3E', // Red
  },
  {
    id: 'dark-purple',
    name: 'Egg plant',
    type: 'dark',
    colors: {
      'base-100': '#2D1B3D', // Deep purple background
      'base-200': '#1A0F26', // Darker purple secondary
      'base-300': '#3D2A4D', // Medium dark purple
      'base-content': '#E6D5FF', // Light lavender text
      'primary': '#B794F6', // Lavender primary
      'secondary': '#9F7AEA', // Medium lavender secondary
      'accent': '#805AD5', // Purple accent
      'neutral': '#9F7AEA', // Lavender neutral
    },
    color1: '#2D1B3D', // Deep purple
    color2: '#E6D5FF', // Light lavender
  },
];

/**
 * All themes combined
 */
export const ALL_THEMES: ThemeDefinition[] = [...LIGHT_THEMES, ...DARK_THEMES];

/**
 * Get theme by ID
 */
export function getThemeById(id: ThemeId): ThemeDefinition | undefined {
  return ALL_THEMES.find(theme => theme.id === id);
}

/**
 * Get default themes (first in each category)
 */
export const DEFAULT_LIGHT_THEME: LightThemeId = 'light-orange';
export const DEFAULT_DARK_THEME: DarkThemeId = 'dark-orange';

