import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

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

    // Increment view count
    const updateData: Database['public']['Tables']['recipes']['Update'] = {
      view_count: (recipe.view_count || 0) + 1,
    };

    const { data: updatedRecipe, error: updateError } = await supabase
      .from('recipes')
      .update(updateData)
      .eq('id', recipe.id)
      .select('view_count')
      .single();

    if (updateError) {
      console.error('Error incrementing view count:', updateError);
      return NextResponse.json(
        { error: 'Failed to update view count' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      view_count: updatedRecipe.view_count,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

