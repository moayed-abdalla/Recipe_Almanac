# Setup Instructions for Recipe Almanac (Next.js + Supabase)

Follow these steps to get your Recipe Almanac application up and running.

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- A Supabase account (free tier is sufficient)
- A GitHub account (for deployment to Vercel)

## Step 1: Supabase Setup

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - **Name**: Recipe Almanac (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait 2-3 minutes for the database to initialize

### 1.2 Run the Database Schema

1. In your Supabase dashboard, click on **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open the file `database/schema.sql` from this project
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. You should see "Success. No rows returned"

### 1.3 Create Storage Buckets

1. In Supabase dashboard, click **Storage** in the left sidebar
2. Click **New bucket**
3. Create bucket named `recipe-images`:
   - Name: `recipe-images`
   - Public bucket: **Yes** (toggle ON)
   - Click **Create bucket**
4. Create another bucket named `avatars`:
   - Name: `avatars`
   - Public bucket: **Yes** (toggle ON)
   - Click **Create bucket**

### 1.4 Get Your API Keys

1. In Supabase dashboard, click **Settings** (gear icon) → **API**
2. Copy the following values (you'll need them in Step 2):
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")

## Step 2: Local Development Setup

### 2.1 Install Dependencies

Open your terminal in the project root and run:

```bash
npm install
```

This installs:
- Next.js 14
- React 18
- Supabase client
- DaisyUI
- TypeScript
- Tailwind CSS

### 2.2 Configure Environment Variables

1. Create a file named `.env.local` in the root directory
2. Add the following (replace with your actual values from Step 1.4):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: 
- Never commit `.env.local` to git (it's already in `.gitignore`)
- The `NEXT_PUBLIC_` prefix makes these variables available in the browser

### 2.3 Run the Development Server

```bash
npm run dev
```

You should see:
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - ready started server on 0.0.0.0:3000
```

### 2.4 Test the Application

1. Open your browser to `http://localhost:3000`
2. You should see the Recipe Almanac homepage
3. Try clicking "Log In" to test authentication
4. Try creating an account to test registration

## Step 3: Deploy to Vercel

### 3.1 Push to GitHub

1. Initialize git (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Next.js + Supabase setup"
   ```

2. Create a repository on GitHub
3. Push your code:
   ```bash
   git remote add origin https://github.com/your-username/Recipe_Almanac.git
   git branch -M main
   git push -u origin main
   ```

### 3.2 Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login (use GitHub)
2. Click **Add New Project**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js
5. **Important**: Before deploying, add environment variables:
   - Click **Environment Variables**
   - Add `NEXT_PUBLIC_SUPABASE_URL` with your Supabase URL
   - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` with your anon key
6. Click **Deploy**

### 3.3 Verify Deployment

1. Wait for deployment to complete (usually 1-2 minutes)
2. Click the deployment URL
3. Test your application:
   - Create an account
   - Create a recipe
   - View recipes

## Step 4: Generate TypeScript Types (Optional but Recommended)

For better type safety, generate TypeScript types from your Supabase schema:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/database.types.ts
```

Then update `lib/supabase.ts` to import from `lib/database.types.ts`.

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` exists in the root directory
- Check that variable names start with `NEXT_PUBLIC_`
- Restart your dev server after adding variables

### "Row Level Security policy violation"
- This means RLS is blocking your query
- Check that you're authenticated when needed
- Verify RLS policies in `database/schema.sql` are correct

### Images not uploading
- Verify storage buckets are set to "Public"
- Check that bucket names match exactly: `recipe-images` and `avatars`
- Ensure you have the correct storage policies (they're in the schema.sql comments)

### Build errors on Vercel
- Check that all environment variables are set in Vercel dashboard
- Make sure `package.json` has all required dependencies
- Check build logs in Vercel dashboard for specific errors

## Next Steps

After setup, you can:

1. **Customize the theme**: Edit `tailwind.config.ts` to adjust colors
2. **Add more features**: See `README_NEXTJS.md` for planned features
3. **Customize pages**: Edit files in `app/` directory
4. **Add components**: Create reusable components in `components/`

## Need Help?

- Check `MIGRATION_GUIDE.md` if migrating from the old version
- Review `database/README.md` for database-specific help
- Check Supabase docs: https://supabase.com/docs
- Check Next.js docs: https://nextjs.org/docs

