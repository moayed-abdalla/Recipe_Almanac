import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();

    const { data: viewCount, error } = await supabase.rpc('increment_view_count', {
      p_slug: params.id,
    });

    if (error) {
      console.error('Error incrementing view count:', error);
      return NextResponse.json({ error: 'Failed to update view count' }, { status: 500 });
    }

    if (viewCount === null) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, view_count: viewCount });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
