# Recipe Almanac

A digital recipe book you can share, browse, and write your own. **No ads. No subscriptions. No marketing fluff. Just recipes.**

## Why Recipe Almanac?

Most recipe sites are a chore to use and cover the actual recipe under ads, pop-ups, email gates, and SEO filler-and still give you unreliable cup-to-gram conversions. Recipe Almanac is built to do the opposite: **recipes first**, with tools that respect your time and privacy.

## What Makes It Different?

| Problem on typical recipe sites | How Recipe Almanac addresses it |
|--------------------------------|----------------------------------|
| Ads, pop-ups, distractions | Ad-free, recipe-focused layout |
| Email signups & data harvesting | Privacy-first; no marketing campaigns |
| SEO/blog filler around the recipe | Clean recipe pages; optional nutrition & notes only where useful |
| Inconsistent volume ↔ weight conversion | Grams-based storage with one-click volume/weight toggle and density-aware conversion |
| One-size-fits-all UI | Eight food-themed light/dark themes (see [Color Themes](#color-themes)) |
| Hard to cook along | Built-in step timers with chime |
| No sense of community quality | Star ratings and a public leaderboard |
| Scattered bookmarks | Personal almanac, follow creators, export/print via **Prepare Almanac** (PDF) |
| Mobile-unfriendly browsing | Responsive design + PWA-style offline page |

**Also included:** full-text search & tags, public/private recipes, view counts, feedback with attachments, and a typewriter + kitchen-icon aesthetic-without subscriptions or ads funding the site.

## How It Works (Current V1.1)

### Technology Stack

- **Frontend**: Next.js 14 with React and TypeScript
- **Styling**: Tailwind CSS with DaisyUI components
- **Backend**: Supabase (PostgreSQL database + Authentication + Storage)
- **Deployment**: Vercel (serverless hosting)
- **Font**: Typewriter-style fonts (Special Elite) for a classic alchemist aesthetic

### Authentication & Security

**All user authentication is handled by Supabase Auth**, which means:
- Secure password hashing (bcrypt)
- Email verification
- Session management
- No need to handle passwords yourself
- Industry-standard security practices
- Admins have no method for accessing or decrypting passwords

When you create an account:
1. Supabase Auth creates your user account securely
2. A profile is automatically created in the database
3. Your session is managed securely
4. You can log in from any device

### Database & Storage

**Supabase PostgreSQL** powers the backend:
- User profiles and recipes stored securely
- Row Level Security (RLS) ensures users can only edit their own content
- Full-text search for finding recipes quickly
- Image storage via Supabase Storage (no local file system needed)

### Unit Conversion

One of Recipe Almanac's standout features is intelligent unit conversion:
- Ingredients stored in grams (base unit)
- Display in volume units (cups, teaspoons, tablespoons)
- One-click toggle between volume and weight
- Ingredient-specific density calculations for accuracy
- Handles common ingredients like flour, sugar, butter, etc.

## Features

### For Recipe Creators
- Create recipes with images
- Add multiple tags for categorization
- Write detailed method steps with step timers
- Include helpful notes
- Set recipes as public or private
- Track view counts
- Copy someones recipe to make your own version and adjustments

### For Recipe Browsers
- Search recipes by name or tags
- Filter by category
- View recipes with logical and consise formatting
- Toggle between measurement units (converts volumetric and weight)
- Approximate nutrition estimates per recipe (EXPERIMENTAL STILL)
- Save recipes to your almanac
- Follow recipe creators
- Rate recipes and explore the leaderboard

### For Everyone
- Clean, distraction-free interface
- Chemistry-themed design with subtle kitchen-icon backgrounds
- 8 light/dark color themes
- Responsive design (works on mobile, tablet, desktop)
- No account required to browse public recipes
- Prepare Almanac(Recipe book) PDF export for saved recipes

## Project Structure

```
Recipe_Almanac/
├── app/                              # Next.js App Router
│   ├── api/
│   │   ├── debug-auth/               # Auth debugging route
│   │   └── recipes/                  # Recipes API + view counter
│   ├── auth/callback/                # Supabase OAuth callback
│   ├── almanac/                      # Signed-in user's saved recipes
│   ├── feedback/                     # User feedback
│   ├── leaderboard/                  # Top recipes by engagement
│   ├── login/                        # Sign in
│   ├── offline/                      # PWA offline fallback
│   ├── prepare_almanac/              # Almanac PDF preparation
│   ├── profile/                      # Profile view & edit
│   │   ├── [username]/               # Public profile
│   │   └── edit/
│   ├── recipe/
│   │   ├── [id]/                     # Recipe detail, edit
│   │   └── create/                   # New recipe
│   ├── register/                     # Sign up (+ confirm)
│   ├── globals.css                   # Theme CSS variables & masks
│   ├── layout.tsx, page.tsx          # Root layout & home
│   ├── error.tsx, robots.ts, sitemap.ts
│   └── HomePage.tsx
├── components/
│   ├── recipe/                       # Grid, ratings, timers, nutrition
│   ├── profile/, navigation/, ui/
│   ├── providers/                    # App + service worker
│   ├── AlmanacBackgroundLayer.tsx
│   ├── Header.tsx, Footer.tsx, SearchBar.tsx, RecipeCard.tsx, …
├── contexts/                         # ProfileContext
├── data/                             # nutrition.json, badWords.json
├── db/                               # SQL snippets (e.g. nutrition_feature.sql)
├── hooks/                            # useAuth
├── lib/
│   ├── theme-config.ts               # Named color themes
│   ├── recipeService.ts, almanacPdf.ts, almanacBackground.ts
│   ├── supabase.ts, supabase-client.ts
│   └── unit-config.ts, timerChime.ts, …
├── public/
│   ├── bg_pic_01.png … bg_pic_12.png # Mask backgrounds
│   ├── fonts/SpecialElite-Regular.ttf
│   ├── manifest.json, sw.js          # PWA assets
│   └── icons, favicons, logo
├── types/                            # Shared TypeScript types
├── utils/                            # unitConverter, nutritionEstimator, …
├── middleware.ts
├── tailwind.config.ts                # DaisyUI themes from theme-config
├── next.config.js, package.json, tsconfig.json
├── clone_guide.md                    # Clone, Supabase, deploy, troubleshooting
└── Readme.md
```

**Note:** Database schema is maintained in Supabase (see [clone_guide.md](clone_guide.md)). Optional SQL lives under `db/`.

## Color Themes

Users pick a theme at registration or in profile settings later. Each theme includes both a light and a dark variant; the header toggle switches between them without changing the selected theme. The choice is stored as `default_theme` on the profile (or `guest-theme` in localStorage for guests). At runtime the app applies a composite DaisyUI ID: `{themeId}-light` or `{themeId}-dark` (ie `tangerine-light`, `cherry-dark`).
The default theme: **Tangerine** (`tangerine`).

| Theme ID | Display name | Brand colors (light / dark anchor) |
|----------|--------------|-------------------------------------|
| `tangerine` | **Tangerine** | Light grey & orange |
| `salt-pepper` | **Salt & Pepper** | Neutral grey |
| `ice` | **Ice** | Navy & ice blue |
| `coffee` | **Coffee** | light tan &  coffee brown |
| `cherry` | **Cherry** | Soft pink & burgandy red |
| `grape` | **Grape** | Deep purple & lavender |
| `banana` | **Banana** | Yellow & dark brown |
| `olive` | **Olive** | Olive green & plum |
| `mojito` | **Mojito** | Forest green & lemon yellow |
| `pb-j` | **PB&J** | Grape jelly purple & peanut tan |
| `watermelon` | **Watermelon** | Green & red |
| `avocado` | **Avocado** | Avocado green & pit brown |

Full palettes (DaisyUI tokens, accent colors, and anchor hex codes) live in [`lib/theme-config.ts`](lib/theme-config.ts). Kitchen background masks are tinted at runtime via `--theme-image-color` and `--theme-bg-opacity`, set from that config when a theme is applied.

## Contributing

Recipe Almanac is open source, feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Share recipes

## License

This project has an MIT license meaning it is open source and available for everyone to use and contribute to.

## Cloning

To run Recipe Almanac locally or deploy your own copy, follow **[clone_guide.md](clone_guide.md)**. It covers prerequisites, Supabase setup (schema, storage buckets, policies), environment variables, `npm run dev`, common issues, and Vercel deployment.

## Support

- **GitHub**: [https://github.com/moayed-abdalla/Recipe_Almanac](https://github.com/moayed-abdalla/Recipe_Almanac)
- **Buy Me a Coffee**: [https://buymeacoffee.com/moayed_abdalla](https://buymeacoffee.com/moayed_abdalla)

--

**Built with ❤️ for chefs and bakers who just want great recipes without the hassle.**
**No emails or user information will ever be shared or taken off platform**
**No ads will be used to fund the website, I would rather take the site down than add advertisments**
