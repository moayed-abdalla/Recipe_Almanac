/**
 * Recipe Grid Component
 * 
 * Reusable recipe grid layout component for displaying recipes in a consistent grid.
 */

import RecipeCard from '@/components/RecipeCard';
import type { NormalizedRecipe } from '@/types';

interface RecipeGridProps {
  /**
   * Array of normalized recipes to display
   */
  recipes: NormalizedRecipe[];
  
  /**
   * Grid columns configuration
   * @default 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
   */
  columns?: string;
  
  /**
   * Gap between grid items
   * @default 'gap-6'
   */
  gap?: string;
}

export default function RecipeGrid({ 
  recipes, 
  columns = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  gap = 'gap-6'
}: RecipeGridProps) {
  return (
    <div className={`grid ${columns} ${gap}`}>
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          id={recipe.id}
          slug={recipe.slug}
          title={recipe.title}
          imageUrl={recipe.image_url}
          description={recipe.description}
          username={recipe.profiles.username}
          viewCount={recipe.view_count}
          favoriteCount={recipe.favorite_count}
          tags={recipe.tags}
        />
      ))}
    </div>
  );
}
