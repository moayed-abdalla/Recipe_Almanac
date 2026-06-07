import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();

    // The hand-written Database type doesn't satisfy supabase-js's GenericSchema
    // constraint (missing Views / Relationships), so Schema resolves to never and the
    // rpc overload collapses args to undefined. Cast through unknown to bypass this
    // while keeping the return type explicit.
    const rpc = supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: number | null; error: { message: string } | null }>;

    const { data: viewCount, error } = await rpc('increment_view_count', {
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
