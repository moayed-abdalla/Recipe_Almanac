import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { fetchRecipeFromUrl, RecipeImportError } from '@/lib/recipeUrlImporter';
import { validateRecipePayload } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Sign in to import recipes from a link.' }, { status: 401 });
    }

    const body = (await request.json()) as { url?: string };
    const url = typeof body.url === 'string' ? body.url.trim() : '';

    if (!url) {
      return NextResponse.json({ error: 'Please enter a recipe URL.' }, { status: 400 });
    }

    const { sourceText, draft } = await fetchRecipeFromUrl(url);

    const draftValidation = validateRecipePayload({
      title: draft.title,
      servings: draft.servings,
      prepTime: draft.prepTime,
      cookTime: draft.cookTime,
      ingredients: draft.ingredients,
    });
    if (!draftValidation.ok) {
      return NextResponse.json(
        {
          error: draftValidation.error,
          sourceText,
          draft,
          validationWarnings: [draftValidation.error],
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ sourceText, draft });
  } catch (error) {
    if (error instanceof RecipeImportError) {
      const status =
        error.code === 'invalid_url' || error.code === 'blocked_url'
          ? 400
          : error.code === 'no_recipe'
            ? 404
            : 502;
      return NextResponse.json({ error: error.message }, { status });
    }

    console.error('Recipe import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
