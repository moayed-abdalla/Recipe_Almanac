import SearchBar from '@/components/SearchBar';
import RecipeCard from '@/components/RecipeCard';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          Recipe Almanac
        </h1>
        <p className="text-center mb-8 text-lg">
          A digital recipe book you can share, browse and write your own.
          No ads, no subscriptions, just recipes.
        </p>
        
        <div className="mb-8">
          <SearchBar />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Recipe cards will be rendered here */}
          {/* This is a placeholder - you'll fetch recipes from Supabase */}
        </div>
      </div>
    </div>
  );
}

