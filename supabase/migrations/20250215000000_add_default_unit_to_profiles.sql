-- Add default_unit column to profiles for user's preferred measurement unit when creating recipes
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS default_unit TEXT DEFAULT 'cups';
