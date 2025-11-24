import { createServerClient } from '@/lib/supabase';
import RecipePageClient from './RecipePageClient';

interface RecipePageProps {
  params: {
    id: string;
  };
}

export default async function RecipePage({ params }: RecipePageProps) {
  const supabase = await createServerClient();
  
  // Fetch recipe data
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select(`
      *,
      profiles:user_id (
        username,
        avatar_url
      )
    `)
    .eq('id', params.id)
    .single();

  if (error || !recipe) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>Recipe not found</span>
        </div>
      </div>
    );
  }

  // Fetch ingredients
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('*')
    .eq('recipe_id', params.id)
    .order('order_index');

  // Increment view count (fire and forget)
  supabase.rpc('increment_recipe_views', { recipe_uuid: params.id });

  return (
    <RecipePageClient
      recipe={recipe}
      ingredients={ingredients || []}
      owner={recipe.profiles}
    />
  );
}

