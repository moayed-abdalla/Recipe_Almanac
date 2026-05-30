import { createServerClient } from '@/lib/supabase';
import type { Profile, RecipeWithProfile, Ingredient } from '@/types';
import { decodeUnitOverrides, parseMultiplier } from '@/lib/printParams';
import PrintView from './PrintView';

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
  const supabase = await createServerClient();

  // Fetch recipe by slug (same pattern as the main recipe detail page).
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select(`
      *,
      profiles:user_id (
        username,
        avatar_url
      )
    `)
    .eq('slug', params.id)
    .single();

  if (error || !recipe) {
    return <PrintError message="Recipe not found" />;
  }

  const typedRecipe = recipe as RecipeWithProfile;
  const owner: Profile | null = Array.isArray(typedRecipe.profiles)
    ? typedRecipe.profiles[0] || null
    : typedRecipe.profiles;

  if (!owner || !owner.username) {
    return <PrintError message="Recipe owner information is incomplete" />;
  }

  // Respect privacy: private recipes are only printable by their owner.
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

  // Fetch ingredients in display order.
  const { data: rawIngredients } = await supabase
    .from('ingredients')
    .select('*')
    .eq('recipe_id', typedRecipe.id)
    .order('order_index');
  const ingredients = (rawIngredients || []) as Ingredient[];

  const multiplier = parseMultiplier(searchParams.m);
  const unitOverrides = decodeUnitOverrides(searchParams.u);
  const autoPrint = searchParams.auto === '1';

  return (
    <PrintView
      recipe={typedRecipe}
      ingredients={ingredients}
      ownerUsername={owner.username}
      multiplier={multiplier}
      unitOverrides={unitOverrides}
      autoPrint={autoPrint}
    />
  );
}
