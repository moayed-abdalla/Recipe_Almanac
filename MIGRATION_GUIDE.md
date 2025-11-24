# Migration Guide: From React + Express to Next.js + Supabase

This guide will help you migrate your Recipe Almanac application from the old React + Express structure to the new Next.js + Supabase architecture.

## Overview of Changes

### Architecture Changes
- **Before**: Separate `client/` (Vite + React) and `server/` (Express) folders
- **After**: Unified Next.js app with API routes in `app/api/`

### Database Changes
- **Before**: Local PostgreSQL with custom connection pooling
- **After**: Supabase (hosted PostgreSQL) with built-in auth and storage

### Key Benefits
- ✅ Serverless deployment on Vercel (no cold start issues)
- ✅ Built-in authentication via Supabase Auth
- ✅ Image storage via Supabase Storage (no file system needed)
- ✅ Better SEO with Next.js Server-Side Rendering
- ✅ Type-safe database queries with TypeScript

## Step-by-Step Migration

### 1. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to initialize
3. Open the SQL Editor in your Supabase dashboard
4. Copy and paste the contents of `database/schema.sql`
5. Click "Run" to execute the schema

### 2. Configure Storage Buckets

1. Navigate to **Storage** in your Supabase dashboard
2. Create two public buckets:
   - `recipe-images` (for recipe photos)
   - `avatars` (for user profile pictures)
3. Set both buckets to **Public**

### 3. Set Up Environment Variables

1. In your Supabase dashboard, go to **Settings > API**
2. Copy your:
   - Project URL
   - `anon` public key
3. Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

### 4. Install Dependencies

```bash
npm install
```

This will install:
- Next.js 14
- React 18
- Supabase client
- DaisyUI
- TypeScript
- Tailwind CSS

### 5. Run the Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your app.

### 6. Migrate Your Data (If You Have Existing Data)

If you have existing recipes in your old database, you'll need to:

1. Export data from your old database
2. Transform it to match the new schema (UUIDs instead of composite keys)
3. Import it into Supabase using the SQL Editor or a migration script

**Important Schema Changes:**
- Recipes now use UUID primary keys instead of `username + recipe_name`
- User authentication is handled by Supabase Auth (not your custom table)
- Images must be uploaded to Supabase Storage (not local `uploads/` folder)

### 7. Deploy to Vercel

1. Push your code to GitHub
2. Log in to [Vercel](https://vercel.com)
3. Click "Add New Project"
4. Select your repository
5. **Important**: Add your environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Click "Deploy"

## File Structure Comparison

### Old Structure
```
Recipe_Almanac/
├── client/          # Vite + React
├── server/          # Express API
└── package.json
```

### New Structure
```
Recipe_Almanac/
├── app/             # Next.js pages and API routes
│   ├── api/         # API endpoints (replaces server/routes)
│   ├── recipe/      # Recipe pages
│   └── ...
├── components/      # React components
├── lib/             # Supabase client (replaces server/database)
├── utils/           # Utility functions
├── database/        # SQL schema files
└── package.json
```

## Key Code Changes

### Authentication

**Before (Express):**
```javascript
// Custom JWT middleware
const token = req.headers.authorization;
```

**After (Supabase):**
```typescript
// Server Component
const supabase = await createServerClient();
const { data: { user } } = await supabase.auth.getUser();

// Client Component
const { data: { user } } = await supabaseClient.auth.getUser();
```

### Database Queries

**Before (Express + PostgreSQL):**
```javascript
const result = await pool.query('SELECT * FROM recipes WHERE ...');
```

**After (Supabase):**
```typescript
const { data, error } = await supabase
  .from('recipes')
  .select('*')
  .eq('is_public', true);
```

### Image Uploads

**Before:**
```javascript
// Save to local uploads/ folder
const filePath = path.join(__dirname, 'uploads', filename);
```

**After:**
```typescript
// Upload to Supabase Storage
const { data, error } = await supabase.storage
  .from('recipe-images')
  .upload(`${userId}/${filename}`, file);

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('recipe-images')
  .getPublicUrl(data.path);
```

## What's Still TODO

The following features need to be implemented:

1. **Recipe Creation/Editing Pages** (`app/recipe/create/page.tsx` and `app/recipe/[id]/edit/page.tsx`)
2. **Image Upload Functionality** (Supabase Storage integration)
3. **Search Functionality** (Full implementation with tag filtering)
4. **Almanac Page** (Fetch and display saved recipes)
5. **Profile Editing** (Update profile description and avatar)

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` exists and has the correct variables
- Restart your dev server after adding environment variables

### "Row Level Security policy violation"
- Check that your RLS policies in `database/schema.sql` are correct
- Make sure you're authenticated when trying to insert/update data

### Images not loading
- Verify your storage buckets are set to "Public"
- Check that the image URLs in your database are correct Supabase Storage URLs

## Need Help?

- Check the [Supabase Documentation](https://supabase.com/docs)
- Check the [Next.js Documentation](https://nextjs.org/docs)
- Review the SQL schema in `database/schema.sql`
- Check the Supabase client setup in `lib/supabase.ts`

