# Recipe Almanac

A digital recipe book you can share, browse, and write your own. **No ads. No subscriptions. No marketing fluff. Just recipes.**

## Why Recipe Almanac?

I created Recipe Almanac after growing frustrated with recipe websites that:
- Clutter pages with ads and pop-ups
- Require email signups and subscriptions
- Fill pages with marketing copy instead of actual recipes
- Make it difficult to convert between measurement units (cups to grams, etc.)
- Prioritize SEO content over user experience

Recipe Almanac is my answer: a clean, ad-free platform focused solely on sharing great recipes with proper unit conversion tools.

## What Makes It Different?

✨ **Ad-Free Experience** - No ads, no pop-ups, no distractions  
🔒 **Privacy-First** - No email harvesting or marketing campaigns  
⚖️ **Smart Unit Conversion** - Easily switch between volume (cups, teaspoons) and weight (grams) measurements  
📝 **Clean Interface** - Focus on the recipe, not the marketing  
🌓 **Dark Mode** - Comfortable viewing in any lighting  
🔍 **Powerful Search** - Find recipes by name or tags  
📚 **Your Almanac** - Save and organize your favorite recipes  

## How It Works

### Technology Stack

Recipe Almanac is built with modern web technologies:

- **Frontend**: Next.js 14 with React and TypeScript
- **Styling**: Tailwind CSS with DaisyUI components
- **Backend**: Supabase (PostgreSQL database + Authentication + Storage)
- **Deployment**: Vercel (serverless hosting)
- **Font**: Typewriter-style fonts (Courier Prime, Special Elite) for a classic alchemist aesthetic

### Authentication & Security

**All user authentication is handled by Supabase Auth**, which means:
- Secure password hashing (bcrypt)
- Email verification (optional)
- Session management
- No need to handle passwords yourself
- Industry-standard security practices

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
- Write detailed method steps
- Include helpful notes
- Set recipes as public or private
- Track view counts

### For Recipe Browsers
- Search recipes by name or tags
- Filter by category
- View recipes with beautiful formatting
- Toggle between measurement units
- Save recipes to your almanac
- Follow recipe creators

### For Everyone
- Clean, distraction-free interface
- Chemistry-themed design with subtle flask backgrounds
- Responsive design (works on mobile, tablet, desktop)
- Dark mode support
- Fast loading times
- No account required to browse public recipes

## Project Structure

```
Recipe_Almanac/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── debug-auth/           # Debug authentication endpoint
│   │   └── recipes/              # Recipes API endpoint
│   ├── almanac/                  # User's saved recipes
│   │   ├── MyAlmanacPage.tsx     # Main almanac component
│   │   └── page.tsx              # Almanac page route
│   ├── feedback/                 # Feedback page
│   │   ├── FeedbackPage.tsx      # Feedback component
│   │   └── page.tsx              # Feedback route
│   ├── login/                    # Login page
│   │   ├── LoginPage.tsx         # Login component
│   │   └── page.tsx              # Login route
│   ├── profile/                  # User profiles
│   │   ├── [username]/           # Dynamic username route
│   │   │   ├── ProfileViewPage.tsx
│   │   │   └── page.tsx
│   │   ├── ProfileEditPage.tsx   # Profile editing component
│   │   └── page.tsx              # Profile route
│   ├── recipe/                   # Recipe pages
│   │   ├── [id]/                 # Dynamic recipe ID route
│   │   │   ├── edit/             # Recipe editing
│   │   │   │   ├── RecipeEditPage.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── RecipeDetailPage.tsx
│   │   │   ├── RecipePageClient.tsx
│   │   │   └── page.tsx
│   │   └── create/               # Recipe creation
│   │       ├── RecipeCreatePage.tsx
│   │       └── page.tsx
│   ├── register/                 # Registration page
│   │   ├── RegisterPage.tsx     # Registration component
│   │   └── page.tsx              # Registration route
│   ├── user/                     # User profile pages
│   │   └── [username]/           # Dynamic username route
│   │       ├── UserProfileAlmanacPage.tsx
│   │       └── page.tsx
│   ├── write_recipe/             # Legacy recipe writing route
│   │   └── page.tsx
│   ├── globals.css               # Global styles
│   ├── HomePage.tsx              # Homepage component
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Homepage route
├── components/                   # Reusable React components
│   ├── Footer.tsx                # Site footer
│   ├── Header.tsx                # Site header/navigation
│   ├── HomePageClient.tsx        # Client-side homepage logic
│   ├── RecipeCard.tsx            # Recipe card component
│   ├── RecipeListClient.tsx     # Recipe list client component
│   └── SearchBar.tsx            # Search bar component
├── lib/                          # Supabase client configuration
│   ├── supabase.ts              # Server-side Supabase client
│   └── supabase-client.ts       # Client-side Supabase client
├── utils/                        # Utility functions
│   └── unitConverter.ts         # Unit conversion utilities
├── public/                       # Static assets
│   ├── bg_pic_01.png … bg_pic_12.png  # Background mask images (kitchen icons)
│   ├── BuyMeACoffee_*.png       # Support images
│   ├── favicon_*.ico            # Favicons
│   └── logo.png                 # Logo image
├── middleware.ts                 # Next.js middleware (auth handling)
├── next.config.js                # Next.js configuration
├── package.json                  # Dependencies and scripts
├── postcss.config.js             # PostCSS configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── DIAGNOSTIC_GUIDE.md           # Comprehensive debugging guide
└── Readme.md                     # This file
```

**Note**: Database schema files are not included in this repository. The database schema should be set up directly in your Supabase project's SQL Editor. See the [Diagnostic Guide](DIAGNOSTIC_GUIDE.md) for detailed setup instructions.

## Getting Started

### Prerequisites
- Node.js 18 or higher
- A Supabase account (free tier works)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/moayed-abdalla/Recipe_Almanac.git
   cd Recipe_Almanac
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a project at [supabase.com](https://supabase.com)
   - Set up your database schema (see [Diagnostic Guide](DIAGNOSTIC_GUIDE.md) for SQL schema)
   - Create storage buckets: `recipe-image`, `avatars`, and `feedback-attachments` (all public)
   - Set up storage policies (see [Diagnostic Guide](DIAGNOSTIC_GUIDE.md) or run `supabase-storage-policies.sql`)
   - Get your API keys from Settings > API

4. **Configure environment variables**
   - Create a `.env.local` file in the root directory
   - Add the following variables:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```
   - Replace the placeholder values with your actual Supabase credentials

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   - Visit `http://localhost:3000`

## Deployment

Recipe Almanac is designed to deploy seamlessly on Vercel:

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add environment variables (Supabase URL and key)
4. Deploy!

Vercel automatically:
- Detects Next.js
- Builds your app
- Deploys to a global CDN
- Sets up serverless functions for API routes

## Color Theme

Recipe Almanac uses a chemistry-inspired color palette:

**Light Mode (Default)**:
- Background: `#F7F7F7` (white-grey)
- Text: `#CC5500` (dark orange)
- Primary: `#FF8C00` (orange)
- Accent: `#87CEEB` (light blue)

**Dark Mode**:
- Inverted colors for comfortable viewing
- Dark background with orange text

## Contributing

Recipe Almanac is open source! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Share recipes

## License

This project is open source and available for everyone to use and contribute to.

## Troubleshooting

If you encounter issues setting up or running the application, please refer to the [Diagnostic Guide](DIAGNOSTIC_GUIDE.md) for comprehensive troubleshooting steps, common issues, and debugging techniques.

## Support

- **GitHub**: [https://github.com/moayed-abdalla/Recipe_Almanac](https://github.com/moayed-abdalla/Recipe_Almanac)
- **Buy Me a Coffee**: [https://buymeacoffee.com/moayed_abdalla](https://buymeacoffee.com/moayed_abdalla)

---

**Built with ❤️ for chefs and bakers who just want great recipes without the hassle.**
