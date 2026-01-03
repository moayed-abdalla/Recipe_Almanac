-- Migration: Add theme preference fields to profiles table
-- Date: 2024
-- Description: Adds default_light_theme and default_dark_theme columns to allow users to customize their theme preferences

-- Add theme preference columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS default_light_theme TEXT CHECK (default_light_theme IN ('light-orange', 'light-grey', 'light-beige')),
ADD COLUMN IF NOT EXISTS default_dark_theme TEXT CHECK (default_dark_theme IN ('dark-orange', 'dark-blue', 'dark-red'));

-- Add comments for documentation
COMMENT ON COLUMN profiles.default_light_theme IS 'User preferred light theme: light-orange (default), light-grey, or light-beige';
COMMENT ON COLUMN profiles.default_dark_theme IS 'User preferred dark theme: dark-orange (default), dark-blue, or dark-red';

