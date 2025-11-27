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
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   ├── almanac/            # User's saved recipes
│   ├── login/              # Login page
│   ├── register/           # Registration page
│   ├── profile/            # User profiles
│   ├── recipe/             # Recipe pages
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Homepage
├── components/             # Reusable React components
├── lib/                    # Supabase client configuration
├── utils/                  # Utility functions (unit conversion, etc.)
├── database/               # Database schema and setup files
└── public/                 # Static assets (logo, images)
```

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
   - Run the SQL schema from `database/schema.sql` in the Supabase SQL Editor
   - Create storage buckets: `recipe-images` and `avatars` (both public)
   - Get your API keys from Settings > API

4. **Configure environment variables**
   - Copy `.env.local.example` to `.env.local`
   - Add your Supabase URL and anon key

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

## Support

- **GitHub**: [https://github.com/moayed-abdalla/Recipe_Almanac](https://github.com/moayed-abdalla/Recipe_Almanac)
- **Buy Me a Coffee**: [https://buymeacoffee.com/moayed_abdalla](https://buymeacoffee.com/moayed_abdalla)

---

**Built with ❤️ for chefs and bakers who just want great recipes without the hassle.**
