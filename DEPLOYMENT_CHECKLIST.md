# Vercel Deployment Checklist

## ✅ Pre-Deployment (Local)

- [x] Removed old `vercel.json` files from `client/` and `server/`
- [x] Created `public/` folder with logo and favicon
- [x] Updated `.gitignore` to exclude old folders
- [x] Verified `package.json` has correct build scripts

## ⚠️ Vercel Dashboard Configuration

### Environment Variables
- [ ] **DELETE** all old environment variables:
  - [ ] `DATABASE_URL`
  - [ ] `JWT_SECRET`
  - [ ] `PORT`
  - [ ] `NODE_ENV`
  - [ ] `CLIENT_URL`
  - [ ] `VITE_API_URL`
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`

- [ ] **ADD** only these two:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://qamgribvekhrzebstqen.supabase.co`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhbWdyaWJ2ZWtocnplYnN0cWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTg2NzEsImV4cCI6MjA3NzgzNDY3MX0.-BCh2byHTeHqPdvvJpmRQyheVa8dDDaA5IPb9FTMkWs`

**⚠️ CRITICAL**: Make sure variable name uses `=` not `+`!

### Project Settings
- [ ] Go to Settings → General
- [ ] Verify **Framework Preset** = "Next.js"
- [ ] Verify **Build Command** = `npm run build`
- [ ] Verify **Output Directory** = `.next`
- [ ] Verify **Install Command** = `npm install`

## 📝 Git Commands

```bash
# Stage all changes
git add .

# Commit
git commit -m "Fix: Remove old vercel.json files, update for Next.js deployment"

# Push to trigger new deployment
git push origin main
```

## 🧪 Test Locally First

Before deploying, test the build:

```bash
# Create .env.local with:
# NEXT_PUBLIC_SUPABASE_URL=https://qamgribvekhrzebstqen.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Test build
npm run build

# If successful, test production server
npm run start
```

## 🚀 Deploy

1. [ ] Update environment variables in Vercel (see above)
2. [ ] Commit and push changes
3. [ ] Wait for automatic deployment, OR
4. [ ] Manually redeploy from Vercel dashboard

## ✅ Post-Deployment Verification

After deployment succeeds:
- [ ] Visit your Vercel URL
- [ ] Test homepage loads
- [ ] Test login/register
- [ ] Test recipe creation
- [ ] Check browser console for errors

## 🐛 If Build Still Fails

1. Check Vercel build logs for specific errors
2. Verify environment variables are correct
3. Make sure you deleted ALL old variables
4. Check that `package.json` has `"build": "next build"`
5. Verify Supabase project is active and accessible

## 📚 Reference Documents

- `VERCEL_DEPLOYMENT.md` - Detailed deployment guide
- `QUICK_FIX_SUMMARY.md` - Quick reference
- `SETUP_INSTRUCTIONS.md` - Initial setup guide

