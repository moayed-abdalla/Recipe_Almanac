-- Recipe Almanac Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable text search extension for better search functionality
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- PROFILES TABLE
-- ============================================
-- This table extends Supabase's auth.users table
-- Supabase Auth handles: email, password, email verification, sessions
-- We only store additional profile information here

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    profile_description TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- ============================================
-- RECIPES TABLE
-- ============================================
-- Uses UUID as primary key (not composite key) for stability
-- Slug is used for pretty URLs but ID is the real identifier

CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL, -- For pretty URLs: /username/recipe-slug
    description TEXT,
    image_url TEXT, -- Supabase Storage URL
    tags TEXT[] DEFAULT '{}', -- Array of tags for filtering
    method_steps TEXT[] DEFAULT '{}', -- Array of method steps
    notes TEXT[] DEFAULT '{}', -- Array of notes
    view_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    -- Ensure unique slug per user
    UNIQUE(user_id, slug)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_slug ON recipes(slug);
CREATE INDEX IF NOT EXISTS idx_recipes_view_count ON recipes(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON recipes(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN(tags); -- GIN index for array searches
CREATE INDEX IF NOT EXISTS idx_recipes_title_search ON recipes USING GIN(to_tsvector('english', title)); -- Full-text search

-- ============================================
-- INGREDIENTS TABLE
-- ============================================
-- Separate table for ingredients to allow multiple ingredients per recipe
-- Stores base amount in grams for unit conversion

CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount_grams NUMERIC(10, 2) NOT NULL, -- Base amount in grams
    unit TEXT NOT NULL, -- Original unit (cup, tsp, etc.) for display
    display_amount NUMERIC(10, 2) NOT NULL, -- Original amount in original unit
    order_index INTEGER NOT NULL, -- Order of ingredients in the recipe
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ingredients_recipe_id ON ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_order ON ingredients(recipe_id, order_index);

-- ============================================
-- SAVED_RECIPES TABLE (Almanac)
-- ============================================
-- Junction table for users saving recipes to their almanac

CREATE TABLE IF NOT EXISTS saved_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    -- Prevent duplicate saves
    UNIQUE(user_id, recipe_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_saved_recipes_user_id ON saved_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_recipes_recipe_id ON saved_recipes(recipe_id);

-- ============================================
-- RECIPE_FORKS TABLE (Future feature)
-- ============================================
-- For the planned "fork" feature similar to GitHub

CREATE TABLE IF NOT EXISTS recipe_forks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    forked_recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    forked_by_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    forked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(forked_recipe_id) -- A recipe can only be forked once
);

CREATE INDEX IF NOT EXISTS idx_recipe_forks_original ON recipe_forks(original_recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_forks_forked_by ON recipe_forks(forked_by_user_id);

-- ============================================
-- RECIPE_STARS TABLE (Future feature)
-- ============================================
-- For the planned "star" feature

CREATE TABLE IF NOT EXISTS recipe_stars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    starred_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(user_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_stars_user_id ON recipe_stars(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_stars_recipe_id ON recipe_stars(recipe_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_forks ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_stars ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, update only their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Recipes: Public recipes are viewable by everyone, users can manage their own
CREATE POLICY "Public recipes are viewable by everyone" ON recipes
    FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own recipes" ON recipes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes" ON recipes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipes" ON recipes
    FOR DELETE USING (auth.uid() = user_id);

-- Ingredients: Viewable with recipe, manageable by recipe owner
CREATE POLICY "Ingredients are viewable with recipe" ON ingredients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = ingredients.recipe_id
            AND (recipes.is_public = true OR recipes.user_id = auth.uid())
        )
    );

CREATE POLICY "Users can manage ingredients for their recipes" ON ingredients
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = ingredients.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

-- Saved Recipes: Users can only see and manage their own saved recipes
CREATE POLICY "Users can view their own saved recipes" ON saved_recipes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save recipes" ON saved_recipes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave recipes" ON saved_recipes
    FOR DELETE USING (auth.uid() = user_id);

-- Recipe Forks: Viewable by everyone, manageable by users
CREATE POLICY "Recipe forks are viewable by everyone" ON recipe_forks
    FOR SELECT USING (true);

CREATE POLICY "Users can create forks" ON recipe_forks
    FOR INSERT WITH CHECK (auth.uid() = forked_by_user_id);

-- Recipe Stars: Viewable by everyone, manageable by users
CREATE POLICY "Recipe stars are viewable by everyone" ON recipe_stars
    FOR SELECT USING (true);

CREATE POLICY "Users can star recipes" ON recipe_stars
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unstar recipes" ON recipe_stars
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for recipes
CREATE TRIGGER update_recipes_updated_at
    BEFORE UPDATE ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_recipe_views(recipe_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE recipes
    SET view_count = view_count + 1
    WHERE id = recipe_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STORAGE BUCKETS SETUP
-- ============================================
-- Note: Storage buckets must be created via Supabase Dashboard or API
-- This is a reference for what buckets you need:
-- 1. 'recipe-images' - Public bucket for recipe images
-- 2. 'avatars' - Public bucket for user profile pictures

-- Example SQL to create buckets (run in Supabase Dashboard > Storage):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('recipe-images', 'recipe-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies (run after creating buckets):
-- CREATE POLICY "Recipe images are publicly accessible" ON storage.objects
--     FOR SELECT USING (bucket_id = 'recipe-images');

-- CREATE POLICY "Users can upload recipe images" ON storage.objects
--     FOR INSERT WITH CHECK (bucket_id = 'recipe-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can update their recipe images" ON storage.objects
--     FOR UPDATE USING (bucket_id = 'recipe-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete their recipe images" ON storage.objects
--     FOR DELETE USING (bucket_id = 'recipe-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Similar policies for 'avatars' bucket...

