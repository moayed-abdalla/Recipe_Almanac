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
 * Recipes are ordered by creation date (most recent first).
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
  tags: string[];
  profiles: {
    username: string;
  };
}

export default async function HomePage() {
  // Create Supabase client for server-side data fetching
  const supabase = await createServerClient();

  // Fetch all public recipes from the database
  // COMMENTED OUT: Order by view count (most popular first) - now ordering by created_at
  // We'll handle pagination on the client side
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select(`
      id,
      slug,
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
    .order('created_at', { ascending: false }); // Changed from view_count to created_at

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
