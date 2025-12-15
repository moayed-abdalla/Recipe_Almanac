# Diagnostic Guide: Complete Setup & Debugging Tutorial

This comprehensive guide will help you set up Recipe Almanac from scratch and debug common issues.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Supabase Configuration](#supabase-configuration)
4. [Environment Variables](#environment-variables)
5. [Database Schema Setup](#database-schema-setup)
6. [Storage Buckets Setup](#storage-buckets-setup)
7. [Running the Application](#running-the-application)
8. [Common Issues & Solutions](#common-issues--solutions)
9. [Debugging Techniques](#debugging-techniques)
10. [Testing Your Setup](#testing-your-setup)
11. [Production Deployment](#production-deployment)

---

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager
- **Git** installed
- A **Supabase account** (free tier works) ([Sign up](https://supabase.com))
- A code editor (VS Code recommended)
- Basic knowledge of terminal/command line

### Verify Prerequisites

```bash
# Check Node.js version
node --version  # Should be 18.0.0 or higher

# Check npm version
npm --version

# Check Git version
git --version
```

---

## Initial Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/moayed-abdalla/Recipe_Almanac.git
cd Recipe_Almanac
```

### Step 2: Install Dependencies

```bash
npm install
```

**Expected Output**: Dependencies should install without errors. If you see errors:
- Check your Node.js version
- Try deleting `node_modules` and `package-lock.json`, then run `npm install` again
- Check your internet connection

### Step 3: Verify Installation

```bash
# Check if Next.js is installed correctly
npx next --version

# Run linting to check for code issues
npm run lint
```

---

## Supabase Configuration

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in:
   - **Name**: Recipe Almanac (or your preferred name)
   - **Database Password**: Choose a strong password (save it securely)
   - **Region**: Choose closest to your users
4. Click **"Create new project"**
5. Wait 2-3 minutes for project initialization

### Step 2: Get Your API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll need:
   - **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
3. Copy these values - you'll need them for environment variables

**⚠️ Important**: Never commit your API keys to version control. The `anon` key is safe for client-side use, but keep it private.

---

## Environment Variables

### Step 1: Create `.env.local` File

In the root directory of your project, create a file named `.env.local`:

```bash
# Windows (PowerShell)
New-Item -Path .env.local -ItemType File

# Mac/Linux
touch .env.local
```

### Step 2: Add Environment Variables

Open `.env.local` and add:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**Replace** `your_project_url_here` and `your_anon_key_here` with your actual Supabase credentials.

**Example**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.abcdefghijklmnopqrstuvwxyz1234567890
```

### Step 3: Verify Environment Variables

The `.env.local` file should be in your `.gitignore` (it already is). Verify:

```bash
# Check if .env.local is ignored
cat .gitignore | grep .env.local
```

**✅ Success**: You should see `.env*.local` in the output.

---

## Database Schema Setup

### Step 1: Access SQL Editor

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**

### Step 2: Create Database Tables

Copy and paste the following SQL into the SQL Editor, then click **"Run"**:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  profile_description TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  method_steps TEXT[] DEFAULT '{}',
  notes TEXT[] DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, slug)
);

-- Create ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount_grams NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  display_amount NUMERIC NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create saved_recipes table (for user's almanac)
CREATE TABLE IF NOT EXISTS saved_recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, recipe_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_slug ON recipes(slug);
CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON recipes(is_public);
CREATE INDEX IF NOT EXISTS idx_ingredients_recipe_id ON ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_saved_recipes_user_id ON saved_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_recipes_recipe_id ON saved_recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call function on new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Step 3: Set Up Row Level Security (RLS)

Run the following SQL to enable Row Level Security:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_recipes ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, but only update their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Recipes: Public recipes are viewable by everyone, private only by owner
CREATE POLICY "Public recipes are viewable by everyone" ON recipes
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own recipes" ON recipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes" ON recipes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipes" ON recipes
  FOR DELETE USING (auth.uid() = user_id);

-- Ingredients: Viewable if recipe is public or user owns recipe
CREATE POLICY "Ingredients are viewable with their recipes" ON ingredients
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

-- Saved recipes: Users can only see and manage their own saved recipes
CREATE POLICY "Users can view their own saved recipes" ON saved_recipes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save recipes" ON saved_recipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave recipes" ON saved_recipes
  FOR DELETE USING (auth.uid() = user_id);
```

### Step 4: Verify Database Setup

1. Go to **Table Editor** in Supabase dashboard
2. You should see 4 tables: `profiles`, `recipes`, `ingredients`, `saved_recipes`
3. Check that RLS is enabled (should show a shield icon)

---

## Storage Buckets Setup

### Step 1: Create Storage Buckets

1. In Supabase dashboard, go to **Storage**
2. Click **"Create a new bucket"**

#### Bucket 1: `recipe-images`
- **Name**: `recipe-images`
- **Public bucket**: ✅ **Yes** (check this)
- **File size limit**: 5MB (or your preference)
- **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/gif`
- Click **"Create bucket"**

#### Bucket 2: `avatars`
- **Name**: `avatars`
- **Public bucket**: ✅ **Yes** (check this)
- **File size limit**: 2MB (or your preference)
- **Allowed MIME types**: `image/jpeg, image/png, image/webp`
- Click **"Create bucket"**

### Step 2: Set Up Storage Policies

Go to **Storage** → **Policies** and create the following:

#### For `recipe-images` bucket:

```sql
-- Allow authenticated users to upload recipe images
CREATE POLICY "Authenticated users can upload recipe images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'recipe-images');

-- Allow authenticated users to update their own recipe images
CREATE POLICY "Users can update their own recipe images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'recipe-images');

-- Allow authenticated users to delete their own recipe images
CREATE POLICY "Users can delete their own recipe images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'recipe-images');

-- Allow public read access to recipe images
CREATE POLICY "Public can view recipe images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'recipe-images');
```

#### For `avatars` bucket:

```sql
-- Allow authenticated users to upload avatars
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access to avatars
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

---

## Running the Application

### Step 1: Start Development Server

```bash
npm run dev
```

**Expected Output**:
```
  ▲ Next.js 14.1.0
  - Local:        http://localhost:3000
  - Ready in 2.3s
```

### Step 2: Open in Browser

Navigate to `http://localhost:3000` in your browser.

**✅ Success Indicators**:
- Page loads without errors
- No console errors in browser DevTools
- Navigation works
- You can see the homepage

### Step 3: Test Authentication

1. Click **"Register"** or **"Login"**
2. Create a test account
3. Verify you can log in and see your profile

---

## Common Issues & Solutions

### Issue 1: "Missing Supabase environment variables"

**Error Message**:
```
Error: Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Solution**:
1. Verify `.env.local` exists in the root directory
2. Check that variable names are correct (case-sensitive)
3. Ensure there are no extra spaces or quotes around values
4. Restart the development server after creating/modifying `.env.local`

**Debug Steps**:
```bash
# Check if file exists
ls -la .env.local  # Mac/Linux
dir .env.local     # Windows

# Verify contents (be careful not to commit this)
cat .env.local
```

---

### Issue 2: "Failed to fetch" or Network Errors

**Symptoms**:
- API calls fail
- Authentication doesn't work
- Data doesn't load

**Solution**:
1. **Check Supabase URL**: Ensure it's correct and includes `https://`
2. **Check API Key**: Verify the anon key is correct
3. **Check CORS**: Supabase handles CORS automatically, but verify your project is active
4. **Check Network Tab**: Open browser DevTools → Network tab to see actual error messages

**Debug Steps**:
```javascript
// Add to browser console to test connection
const testUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
console.log('Supabase URL:', testUrl);

// Test API endpoint
fetch(`${testUrl}/rest/v1/profiles?select=*`, {
  headers: {
    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

---

### Issue 3: "Table doesn't exist" or "relation does not exist"

**Error Message**:
```
relation "profiles" does not exist
```

**Solution**:
1. Verify you ran all SQL schema scripts
2. Check Supabase dashboard → Table Editor to confirm tables exist
3. Ensure you're connected to the correct Supabase project
4. Re-run the database schema SQL if needed

**Debug Steps**:
```sql
-- Run in Supabase SQL Editor to check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

---

### Issue 4: Authentication Not Working

**Symptoms**:
- Can't log in
- Can't register
- Session not persisting

**Solution**:
1. **Check RLS Policies**: Ensure Row Level Security policies are set up correctly
2. **Check Middleware**: Verify `middleware.ts` exists and is configured
3. **Check Cookies**: Ensure cookies are enabled in your browser
4. **Check Supabase Auth Settings**: In Supabase dashboard → Authentication → Settings

**Debug Steps**:
```typescript
// Add to a page component temporarily
'use client';
import { useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';

export default function DebugAuth() {
  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getSession().then(({ data, error }) => {
      console.log('Session:', data);
      console.log('Error:', error);
    });
  }, []);
  return <div>Check console</div>;
}
```

---

### Issue 5: Images Not Uploading

**Symptoms**:
- Image upload fails
- Images don't display
- Storage errors

**Solution**:
1. **Verify Storage Buckets**: Check that `recipe-images` and `avatars` buckets exist
2. **Check Storage Policies**: Ensure policies allow uploads
3. **Check File Size**: Verify file is under the bucket's size limit
4. **Check MIME Types**: Ensure file type is allowed

**Debug Steps**:
```typescript
// Test storage upload
const testUpload = async () => {
  const supabase = createBrowserClient();
  const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
  
  const { data, error } = await supabase.storage
    .from('recipe-images')
    .upload('test/test.jpg', file);
  
  console.log('Upload result:', data);
  console.log('Upload error:', error);
};
```

---

### Issue 6: Build Errors

**Error Message**:
```
Error occurred prerendering page "/"
```

**Solution**:
1. **Check Server Components**: Ensure async Server Components handle errors
2. **Check Environment Variables**: They might not be available during build
3. **Check TypeScript Errors**: Run `npm run lint` to find type errors
4. **Clear Build Cache**: Delete `.next` folder and rebuild

**Debug Steps**:
```bash
# Clear Next.js cache
rm -rf .next  # Mac/Linux
rmdir /s .next  # Windows

# Rebuild
npm run build
```

---

### Issue 7: "Hydration Mismatch" Errors

**Symptoms**:
- Console warnings about hydration
- UI flickering
- Different content on server vs client

**Solution**:
1. **Check for Browser-Only Code**: Use `useEffect` for client-only logic
2. **Check Date/Time Rendering**: Use consistent formatting
3. **Check Random Values**: Don't generate random values during render
4. **Check Conditional Rendering**: Ensure server and client render the same initial state

**Debug Steps**:
```typescript
// Wrap client-only code
'use client';
import { useEffect, useState } from 'react';

export default function ClientOnlyComponent() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;
  
  // Client-only code here
  return <div>Client content</div>;
}
```

---

## Debugging Techniques

### 1. Browser DevTools

**Open DevTools**: `F12` or `Right-click → Inspect`

**Key Tabs**:
- **Console**: Check for JavaScript errors
- **Network**: Monitor API calls and responses
- **Application**: Check cookies, localStorage, sessionStorage
- **React DevTools**: Install React DevTools extension for component debugging

### 2. Server-Side Debugging

**Add Console Logs**:
```typescript
// In Server Components
console.log('Server-side data:', data);

// In API routes
console.log('Request:', request);
console.log('Response:', response);
```

**Check Terminal**: Server-side logs appear in the terminal where `npm run dev` is running.

### 3. Supabase Dashboard

**Useful Tools**:
- **Logs**: View API requests and errors
- **Table Editor**: Manually inspect/edit data
- **SQL Editor**: Run queries to debug data issues
- **Authentication**: View users and sessions
- **Storage**: Browse uploaded files

### 4. Network Debugging

**Check API Calls**:
1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Click on a request to see:
   - Request headers
   - Request payload
   - Response status
   - Response data

**Common Issues**:
- **401 Unauthorized**: Authentication problem
- **403 Forbidden**: RLS policy blocking access
- **404 Not Found**: Wrong endpoint or missing data
- **500 Server Error**: Server-side error (check Supabase logs)

### 5. Environment Variable Debugging

**Verify Variables are Loaded**:
```typescript
// Add temporarily to a page
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
```

**⚠️ Warning**: Never log full API keys in production!

### 6. Database Query Debugging

**Test Queries in Supabase SQL Editor**:
```sql
-- Check if user exists
SELECT * FROM auth.users WHERE email = 'test@example.com';

-- Check profiles
SELECT * FROM profiles;

-- Check recipes
SELECT * FROM recipes LIMIT 10;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'recipes';
```

---

## Testing Your Setup

### Test Checklist

Run through this checklist to verify everything works:

#### ✅ Basic Setup
- [ ] Application starts without errors (`npm run dev`)
- [ ] Homepage loads at `http://localhost:3000`
- [ ] No console errors in browser
- [ ] Navigation works

#### ✅ Authentication
- [ ] Can register a new account
- [ ] Can log in with registered account
- [ ] Can log out
- [ ] Session persists after page refresh
- [ ] Profile is created automatically on registration

#### ✅ Database
- [ ] Can view public recipes
- [ ] Can create a new recipe
- [ ] Can edit own recipe
- [ ] Can delete own recipe
- [ ] Cannot edit/delete other users' recipes
- [ ] Ingredients save correctly
- [ ] Can save recipes to almanac

#### ✅ Storage
- [ ] Can upload recipe image
- [ ] Can upload avatar
- [ ] Images display correctly
- [ ] Can delete uploaded images

#### ✅ Features
- [ ] Search works
- [ ] Unit conversion works
- [ ] Dark mode toggle works
- [ ] Responsive design works on mobile

### Quick Test Script

Create a test file `test-setup.ts` (temporary):

```typescript
// test-setup.ts
import { createBrowserClient } from './lib/supabase-client';

async function testSetup() {
  const supabase = createBrowserClient();
  
  console.log('Testing Supabase connection...');
  
  // Test 1: Check connection
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
  
  if (profilesError) {
    console.error('❌ Database connection failed:', profilesError);
    return;
  }
  console.log('✅ Database connection successful');
  
  // Test 2: Check storage
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    console.error('❌ Storage access failed:', bucketsError);
    return;
  }
  
  const hasRecipeImages = buckets?.some(b => b.name === 'recipe-images');
  const hasAvatars = buckets?.some(b => b.name === 'avatars');
  
  if (!hasRecipeImages || !hasAvatars) {
    console.error('❌ Storage buckets missing');
    return;
  }
  console.log('✅ Storage buckets configured');
  
  // Test 3: Check authentication
  const { data: { session } } = await supabase.auth.getSession();
  console.log('✅ Authentication check passed');
  console.log('Session:', session ? 'Active' : 'None');
  
  console.log('\n✅ All tests passed! Setup is correct.');
}

testSetup();
```

Run with: `npx ts-node test-setup.ts` (requires `ts-node`: `npm install -D ts-node`)

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Environment variables set in deployment platform
- [ ] Database schema deployed
- [ ] Storage buckets created
- [ ] RLS policies enabled
- [ ] Build succeeds locally (`npm run build`)
- [ ] No TypeScript errors (`npm run lint`)
- [ ] Test all critical user flows

### Vercel Deployment

1. **Push to GitHub**: Ensure all code is committed and pushed
2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
3. **Configure Environment Variables**:
   - Add `NEXT_PUBLIC_SUPABASE_URL`
   - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy**: Click "Deploy"

### Environment Variables in Production

**Vercel**:
- Go to Project Settings → Environment Variables
- Add variables for Production, Preview, and Development

**Other Platforms**:
- Follow platform-specific instructions for environment variables
- Ensure variables are available at build time

### Post-Deployment Verification

1. **Check Build Logs**: Ensure build succeeded
2. **Test Production URL**: Verify site loads
3. **Test Authentication**: Create account and log in
4. **Test Core Features**: Create recipe, upload image, etc.
5. **Check Error Monitoring**: Set up error tracking (Sentry, etc.)

---

## Additional Resources

### Official Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [DaisyUI Documentation](https://daisyui.com/components/)

### Getting Help

1. **Check Error Messages**: Read error messages carefully - they often point to the issue
2. **Search Issues**: Check GitHub issues for similar problems
3. **Supabase Community**: [Discord](https://discord.supabase.com) or [GitHub Discussions](https://github.com/supabase/supabase/discussions)
4. **Next.js Community**: [GitHub Discussions](https://github.com/vercel/next.js/discussions)

### Common Debugging Commands

```bash
# Check for TypeScript errors
npm run lint

# Build the application
npm run build

# Start production server (after build)
npm start

# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version

# Check npm version
npm --version
```

---

## Troubleshooting Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| Environment variables not loading | Restart dev server, check `.env.local` exists |
| Database connection failed | Verify Supabase URL and key, check project is active |
| Authentication not working | Check RLS policies, verify middleware.ts exists |
| Images not uploading | Verify storage buckets exist and policies are set |
| Build errors | Clear `.next` folder, check TypeScript errors |
| Hydration errors | Ensure server/client render same initial state |

---

**Last Updated**: Check the repository for the latest version of this guide.

**Need More Help?** Open an issue on [GitHub](https://github.com/moayed-abdalla/Recipe_Almanac/issues).
