import SearchBar from '@/components/SearchBar';
import RecipeCard from '@/components/RecipeCard';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Hero section */}
        <div className="text-center mb-12 relative">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 typewriter text-base-content">
            Recipe Almanac
          </h1>
          <p className="text-center mb-8 text-lg max-w-2xl mx-auto italic text-base-content/60">
            A digital recipe book you can share, browse and write your own.
            <br />
            No ads, no subscriptions, just recipes.
          </p>
        </div>
        
        <div className="mb-12">
          <SearchBar />
        </div>

        {/* Decorative divider */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px bg-gradient-to-r from-transparent via-base-300 to-transparent flex-1"></div>
          <span className="text-sm opacity-60 font-mono">RECIPES</span>
          <div className="h-px bg-gradient-to-r from-transparent via-base-300 to-transparent flex-1"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Recipe cards will be rendered here */}
          {/* This is a placeholder - you'll fetch recipes from Supabase */}
        </div>
      </div>
    </div>
  );
}

