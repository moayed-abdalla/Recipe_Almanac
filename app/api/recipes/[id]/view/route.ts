import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type RecipeRow = Database['public']['Tables']['recipes']['Row'];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    
    // Get the recipe by slug (params.id contains the slug)
    const { data: recipe, error: fetchError } = await supabase
      .from('recipes')
      .select('id, view_count')
      .eq('slug', params.id)
      .single();

    if (fetchError || !recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Type assertion for the selected fields
    const recipeData = recipe as Pick<RecipeRow, 'id' | 'view_count'>;
    const newViewCount = (recipeData.view_count || 0) + 1;

    // Increment view count
    // Create a fresh client instance to avoid type inference issues from previous .select()
    const updateClient = await createServerClient();
    const { error: updateError } = await updateClient
      .from('recipes')
      // @ts-ignore - Supabase type inference limitation when chaining .select() and .update()
      .update({ view_count: newViewCount })
      .eq('id', recipeData.id);

    if (updateError) {
      console.error('Error incrementing view count:', updateError);
      return NextResponse.json(
        { error: 'Failed to update view count' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      view_count: newViewCount,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

