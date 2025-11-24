# Recipe Almanac - Next.js Version

This is the Next.js + Supabase version of Recipe Almanac, migrated from the original React + Express setup.

## Quick Start

### Prerequisites
- Node.js 18+ 
- A Supabase account (free tier works)

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Recipe_Almanac
   ```

2. **Set up Supabase**
   - Create a project at [supabase.com](https://supabase.com)
   - Run the SQL schema from `database/schema.sql` in the Supabase SQL Editor
   - Create storage buckets: `recipe-images` and `avatars` (both public)

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Configure environment variables**
   - Copy `.env.local.example` to `.env.local`
   - Add your Supabase URL and anon key from the Supabase dashboard

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   - Visit `http://localhost:3000`

## Project Structure

```
Recipe_Almanac/
├── app/                    # Next.js App Router
│   ├── api/                # API routes (replaces Express routes)
│   ├── almanac/            # Almanac page
│   ├── login/              # Login page
│   ├── register/           # Registration page
│   ├── profile/            # Profile pages
│   ├── recipe/             # Recipe pages
│   ├── layout.tsx          # Root layout with Header/Footer
│   └── page.tsx            # Homepage
├── components/             # Reusable React components
├── lib/                    # Configuration and utilities
│   ├── supabase.ts         # Server-side Supabase client
│   └── supabase-client.ts  # Client-side Supabase client
├── utils/                  # Utility functions
│   └── unitConverter.ts    # Unit conversion logic
├── database/               # Database schema
│   ├── schema.sql          # Complete Supabase schema
│   └── README.md           # Database setup instructions
└── public/                 # Static assets

```

## Key Features

- ✅ **Serverless Architecture**: Deploys to Vercel with zero configuration
- ✅ **Type-Safe**: Full TypeScript support
- ✅ **Modern UI**: DaisyUI components with custom theme
- ✅ **Authentication**: Supabase Auth (email/password)
- ✅ **Image Storage**: Supabase Storage (no file system needed)
- ✅ **Search**: Full-text search on recipe titles
- ✅ **Dark Mode**: Automatic theme switching

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

Vercel will automatically:
- Detect Next.js
- Build your app
- Deploy to a global CDN
- Set up serverless functions for API routes

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database Types

Generate TypeScript types from your Supabase schema:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/database.types.ts
```

Then update `lib/supabase.ts` to import from `database.types.ts`.

## Migration from Old Version

See `MIGRATION_GUIDE.md` for detailed instructions on migrating from the React + Express version.

## Color Palette

### Light Mode
- Background: `#E6C59E`
- Secondary: `#F2E2CE`
- Font: `#191510`
- Light Accent: `#d7d9ea`
- Dark Accent: `#0e101b`

### Dark Mode
- Background: `#0E101B`
- Secondary: `#353745`
- Font: `#d7d9ea`
- Light Accent: `#F2E2CE`
- Dark Accent: `#E6C59E`

## Planned Features

- [ ] Recipe creation/editing pages
- [ ] Image upload functionality
- [ ] Enhanced search with filters
- [ ] Recipe forking (similar to GitHub)
- [ ] Recipe starring
- [ ] Comments on recipes
- [ ] Multiple theme options

## License

This project is open source and available for everyone to use and contribute to.

