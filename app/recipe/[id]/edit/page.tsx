import { createServerClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { RecipeForm } from '@/app/recipe/create/page';

interface RecipeEditPageProps {
  params: {
    slug: string; // Format: username-recipe-slug
  };
}

interface Recipe {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  tags: string[];
  method_steps: string[];
  notes: string[];
  is_public: boolean;
}

interface Ingredient {
  id: string;
  name: string;
  amount_grams: number;
  unit: string;
  display_amount: number;
  order_index: number;
}

export default async function RecipeEditPage({ params }: RecipeEditPageProps) {
  const supabase = await createServerClient();
  
  // Fetch recipe data by slug (format: username-recipe-slug)
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (recipeError || !recipe) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>Recipe not found</span>
        </div>
      </div>
    );
  }

  // Type assertion after null check
  const typedRecipe = recipe as Recipe;

  // Check if current user is the recipe owner
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || user.id !== typedRecipe.user_id) {
    redirect(`/recipe/${params.slug}`);
  }

  // Fetch ingredients
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('*')
    .eq('recipe_id', typedRecipe.id)
    .order('order_index');

  return (
    <RecipeForm
      recipe={typedRecipe}
      ingredients={(ingredients || []) as Ingredient[]}
    />
  );
}

