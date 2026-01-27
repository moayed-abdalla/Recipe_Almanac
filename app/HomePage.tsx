/**
 * Homepage Component
 * 
 * Displays the main landing page with:
 * - Hero section with site title and description
 * - Search bar for finding recipes
 * - Paginated grid of public recipes from the database
 * 
 * This is a Server Component that fetches recipes from Supabase.
 * Only public recipes are displayed on the homepage.
 * Recipes are ordered by view count by default (most views first).
 * Users can change sorting via client-side controls.
 */

import { createServerClient } from '@/lib/supabase';
import HomePageClient from '@/components/HomePageClient';

interface Recipe {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  description: string | null;
  view_count: number;
  favorite_count: number;
  created_at: string;
  tags: string[];
  profiles: {
    username: string;
  };
}

const extractFavoriteCount = (recipe: any): number => {
  const candidate = recipe.favorite_count ?? recipe.saved_recipes;
  if (typeof candidate === 'number') return candidate;
  if (Array.isArray(candidate)) return candidate[0]?.count ?? 0;
  if (candidate && typeof candidate === 'object' && 'count' in candidate) {
    return candidate.count ?? 0;
  }
  return 0;
};

export default async function HomePage() {
  // Create Supabase client for server-side data fetching
  const supabase = await createServerClient();

  // Fetch all public recipes from the database
  // Default sort: by view count (most popular first)
  // Client-side sorting will allow users to change this
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select(`
      id,
      slug,
      title,
      image_url,
      description,
      view_count,
      favorite_count:saved_recipes(count),
      created_at,
      tags,
      profiles:user_id (
        username
      )
    `)
    .eq('is_public', true)
    .order('view_count', { ascending: false }); // Default: most views to least views

  // Handle errors gracefully
  if (error) {
    console.error('Error fetching recipes:', error);
  }

  // Type assertion for recipes data
  // Handle profiles as array or single object
  const typedRecipes = (recipes || []).map((recipe: any) => {
    const profile = Array.isArray(recipe.profiles) 
      ? recipe.profiles[0] 
      : recipe.profiles;
    
    return {
      ...recipe,
      favorite_count: extractFavoriteCount(recipe),
      profiles: profile || { username: 'Unknown' },
    };
  }) as Recipe[];

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
        
        {/* Search and recipe list (client-side filtering) */}
        <HomePageClient recipes={typedRecipes} />
      </div>
    </div>
  );
}
