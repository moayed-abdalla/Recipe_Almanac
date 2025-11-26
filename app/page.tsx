import SearchBar from '@/components/SearchBar';
import RecipeCard from '@/components/RecipeCard';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Decorative header with steampunk elements */}
        <div className="text-center mb-12 relative">
          <div className="inline-block mb-4">
            <div className="steampunk-border p-6 bg-base-200/50 backdrop-blur-sm">
              <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Recipe Almanac
              </h1>
              <div className="flex justify-center items-center gap-2 mb-4">
                <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent flex-1 max-w-xs"></div>
                <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent flex-1 max-w-xs"></div>
              </div>
            </div>
          </div>
          <p className="text-center mb-8 text-lg max-w-2xl mx-auto alchemist-accent italic">
            A digital recipe book you can share, browse and write your own.
            <br />
            <span className="text-base-content/70">No ads, no subscriptions, just recipes.</span>
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

