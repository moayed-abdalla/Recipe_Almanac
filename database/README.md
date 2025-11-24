# Database Setup Instructions

This folder contains the SQL schema for setting up your Supabase database.

## Setup Steps

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Wait for the database to initialize

2. **Run the Schema**
   - Open your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `schema.sql`
   - Click "Run" to execute the schema

3. **Set Up Storage Buckets**
   - Navigate to Storage in your Supabase dashboard
   - Create two public buckets:
     - `recipe-images` (for recipe photos)
     - `avatars` (for user profile pictures)
   - Set both buckets to "Public"

4. **Configure Storage Policies**
   - For each bucket, go to Policies
   - Add the following policies (or use the SQL provided in schema.sql comments):
     - Public read access
     - Authenticated users can upload
     - Users can only update/delete their own files

5. **Enable Authentication**
   - Go to Authentication > Providers
   - Enable "Email" provider
   - Configure email settings as needed

6. **Get Your API Keys**
   - Go to Settings > API
   - Copy your:
     - Project URL
     - `anon` public key
   - Add these to your `.env.local` file (see root directory)

## Environment Variables

After setup, add these to your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Database Schema Overview

- **profiles**: User profile information (extends Supabase auth.users)
- **recipes**: Recipe data with UUID primary keys and slugs for URLs
- **ingredients**: Recipe ingredients with base amounts in grams
- **saved_recipes**: Junction table for user's saved recipes (almanac)
- **recipe_forks**: Future feature for forking recipes
- **recipe_stars**: Future feature for starring recipes

## Notes

- All tables use Row Level Security (RLS) for data protection
- UUIDs are used instead of composite keys for stability
- Full-text search is enabled on recipe titles
- Array indexes are used for efficient tag filtering

