# Vercel Deployment Fix Guide

## Issues Fixed

1. ✅ Removed old `vercel.json` files from `client/` and `server/` folders
2. ✅ Updated `.gitignore` to exclude old folders
3. ✅ Created clean `.env.local.example` with only necessary variables

## Environment Variables for Vercel

**IMPORTANT**: In your Vercel dashboard, you should ONLY have these two environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://qamgribvekhrzebstqen.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhbWdyaWJ2ZWtocnplYnN0cWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTg2NzEsImV4cCI6MjA3NzgzNDY3MX0.-BCh2byHTeHqPdvvJpmRQyheVa8dDDaA5IPb9FTMkWs
```

### Remove These (Not Needed):
- ❌ `DATABASE_URL` - Supabase handles this internally
- ❌ `JWT_SECRET` - Supabase Auth handles this
- ❌ `PORT` - Vercel sets this automatically
- ❌ `NODE_ENV` - Vercel sets this automatically
- ❌ `CLIENT_URL` - Not needed for Next.js
- ❌ `VITE_API_URL` - This is for Vite, not Next.js
- ❌ `VITE_SUPABASE_URL` - Use `NEXT_PUBLIC_SUPABASE_URL` instead
- ❌ `VITE_SUPABASE_ANON_KEY` - Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead

## Fix Your Environment Variables

### In Vercel Dashboard:

1. Go to your project settings
2. Click **Environment Variables**
3. **Delete all the old variables** listed above
4. **Add only these two**:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://qamgribvekhrzebstqen.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhbWdyaWJ2ZWtocnplYnN0cWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTg2NzEsImV4cCI6MjA3NzgzNDY3MX0.-BCh2byHTeHqPdvvJpmRQyheVa8dDDaA5IPb9FTMkWs`

**Note**: Make sure there's an `=` sign, not a `+` sign in the variable name!

## Vercel Project Settings

1. Go to **Settings** → **General**
2. Make sure **Framework Preset** is set to **Next.js** (it should auto-detect)
3. **Build Command**: Should be `npm run build` (auto-detected)
4. **Output Directory**: Should be `.next` (auto-detected)
5. **Install Command**: Should be `npm install` (auto-detected)

## After Making Changes

1. **Commit and push** the changes (removed old vercel.json files)
2. **Update environment variables** in Vercel dashboard
3. **Redeploy** your project (or push a new commit to trigger redeploy)

## Why the Build Failed

The build failed because:
1. Old `vercel.json` files were telling Vercel to use the old Express server setup
2. Vercel was trying to run `npm run dev` instead of `npm run build`
3. The `PORT=5000` environment variable was conflicting with Vercel's port management

## Next Steps

1. ✅ Delete old `vercel.json` files (done)
2. ✅ Update `.gitignore` (done)
3. ⏳ Update Vercel environment variables (you need to do this)
4. ⏳ Commit and push changes
5. ⏳ Redeploy on Vercel

## Testing Locally

Before deploying, test locally:

```bash
# Make sure you have the correct .env.local
NEXT_PUBLIC_SUPABASE_URL=https://qamgribvekhrzebstqen.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhbWdyaWJ2ZWtocnplYnN0cWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTg2NzEsImV4cCI6MjA3NzgzNDY3MX0.-BCh2byHTeHqPdvvJpmRQyheVa8dDDaA5IPb9FTMkWs

# Then run
npm run build
npm run start
```

If the build succeeds locally, it should work on Vercel too.

