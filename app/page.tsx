/**
 * Homepage Component
 * 
 * Displays the main landing page with:
 * - Hero section with site title and description
 * - Search bar for finding recipes
 * - Grid of public recipes from the database
 * 
 * This is a Server Component that fetches recipes from Supabase.
 * Only public recipes are displayed on the homepage.
 */

import { createServerClient } from '@/lib/supabase';
import SearchBar from '@/components/SearchBar';
import RecipeCard from '@/components/RecipeCard';

interface Recipe {
  id: string;
  title: string;
  image_url: string | null;
  description: string | null;
  view_count: number;
  tags: string[];
  profiles: {
    username: string;
  };
}

export default async function Home() {
  // Create Supabase client for server-side data fetching
  const supabase = await createServerClient();

  // Fetch public recipes from the database
  // Only fetch recipes that are marked as public
  // Order by view count (most popular first) and limit to 20 recipes
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select(`
      id,
      title,
      image_url,
      description,
      view_count,
      tags,
      profiles:user_id (
        username
      )
    `)
    .eq('is_public', true)
    .order('view_count', { ascending: false })
    .limit(20);

  // Handle errors gracefully
  if (error) {
    console.error('Error fetching recipes:', error);
  }

  // Type assertion for recipes data
  const typedRecipes = (recipes || []) as Recipe[];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Hero section with site branding */}
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
        
        {/* Search bar for finding recipes */}
        <div className="mb-12">
          <SearchBar />
        </div>

        {/* Decorative divider */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px bg-gradient-to-r from-transparent via-base-300 to-transparent flex-1"></div>
          <span className="text-sm opacity-60 font-mono">RECIPES</span>
          <div className="h-px bg-gradient-to-r from-transparent via-base-300 to-transparent flex-1"></div>
        </div>

        {/* Recipe cards grid */}
        {typedRecipes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg opacity-70">No recipes found. Be the first to create one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {typedRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                id={recipe.id}
                title={recipe.title}
                imageUrl={recipe.image_url}
                description={recipe.description}
                username={recipe.profiles.username}
                viewCount={recipe.view_count}
                tags={recipe.tags}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

