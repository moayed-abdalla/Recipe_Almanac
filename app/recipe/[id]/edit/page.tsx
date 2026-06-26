import { createServerClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { getRecipeBySlug } from '@/lib/recipeServer';
import { INGREDIENT_SELECT } from '@/lib/recipeQueries';
import { RecipeForm } from '@/components/recipe/RecipeForm';
import type { Recipe, Ingredient } from '@/types';
import type { RecipeCopySource } from '@/lib/recipeCopyAttribution';

interface RecipeEditPageProps {
  params: {
    id: string; // Format: username-recipe-slug (treated as slug)
  };
}

export default async function RecipeEditPage({ params }: RecipeEditPageProps) {
  const typedRecipe = await getRecipeBySlug(params.id);

  if (!typedRecipe) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>Recipe not found</span>
        </div>
      </div>
    );
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== typedRecipe.user_id) {
    redirect(`/recipe/${params.id}`);
  }

  const [ingredientsResult, copySourceResult] = await Promise.all([
    supabase
      .from('ingredients')
      .select(INGREDIENT_SELECT)
      .eq('recipe_id', typedRecipe.id)
      .order('order_index'),
    typedRecipe.copied_from_recipe_id
      ? supabase
          .from('recipes')
          .select('slug, title')
          .eq('id', typedRecipe.copied_from_recipe_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const ingredients = (ingredientsResult.data || []) as Ingredient[];
  const copySourceRow = copySourceResult.data as
    | { slug: string; title: string }
    | null;
  const copySource: RecipeCopySource | null = copySourceRow
    ? { slug: copySourceRow.slug, title: copySourceRow.title }
    : null;

  return (
    <RecipeForm
      recipe={typedRecipe as Recipe}
      ingredients={ingredients}
      copySource={copySource}
    />
  );
}
