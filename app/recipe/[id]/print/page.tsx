import { createServerClient } from '@/lib/supabase';
import { getRecipeBySlug } from '@/lib/recipeServer';
import { INGREDIENT_SELECT } from '@/lib/recipeQueries';
import type { Profile, RecipeWithProfile, Ingredient } from '@/types';
import { decodeUnitOverrides, parseMultiplier } from '@/lib/printParams';
import PrintView from './PrintView';
import type { RecipeCopySource } from '@/lib/recipeCopyAttribution';

// Always render on demand so privacy/RLS and auth state are evaluated fresh.
export const dynamic = 'force-dynamic';

interface PrintPageProps {
  params: {
    id: string; // Slug (format: username-recipe-slug)
  };
  searchParams: {
    m?: string;
    u?: string;
    auto?: string;
  };
}

function PrintError({ message }: { message: string }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="alert alert-error">
        <span>{message}</span>
      </div>
    </div>
  );
}

export default async function RecipePrintPage({ params, searchParams }: PrintPageProps) {
  const typedRecipe = await getRecipeBySlug(params.id);

  if (!typedRecipe) {
    return <PrintError message="Recipe not found" />;
  }

  const owner: Profile | null = Array.isArray(typedRecipe.profiles)
    ? typedRecipe.profiles[0] || null
    : typedRecipe.profiles;

  if (!owner || !owner.username) {
    return <PrintError message="Recipe owner information is incomplete" />;
  }

  const supabase = await createServerClient();

  if (!typedRecipe.is_public) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== typedRecipe.user_id) {
      return (
        <PrintError message="This recipe is private and you don't have permission to view it." />
      );
    }
  }

  const { data: rawIngredients } = await supabase
    .from('ingredients')
    .select(INGREDIENT_SELECT)
    .eq('recipe_id', typedRecipe.id)
    .order('order_index');
  const ingredients = (rawIngredients || []) as Ingredient[];

  let copySource: RecipeCopySource | null = null;
  if (typedRecipe.copied_from_recipe_id) {
    const { data: sourceRecipe } = await supabase
      .from('recipes')
      .select('slug, title')
      .eq('id', typedRecipe.copied_from_recipe_id)
      .maybeSingle();
    if (sourceRecipe) {
      copySource = { slug: sourceRecipe.slug, title: sourceRecipe.title };
    }
  }

  const multiplier = parseMultiplier(searchParams.m);
  const unitOverrides = decodeUnitOverrides(searchParams.u);
  const autoPrint = searchParams.auto === '1';

  return (
    <PrintView
      recipe={typedRecipe as RecipeWithProfile}
      ingredients={ingredients}
      ownerUsername={owner.username}
      multiplier={multiplier}
      unitOverrides={unitOverrides}
      autoPrint={autoPrint}
      copySource={copySource}
    />
  );
}
