import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerClient();
    
    // Check session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // Check user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Check cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    return NextResponse.json({
      success: true,
      session: {
        exists: !!session,
        userId: session?.user?.id || null,
        email: session?.user?.email || null,
        expiresAt: session?.expires_at || null,
        error: sessionError?.message || null
      },
      user: {
        exists: !!user,
        userId: user?.id || null,
        email: user?.email || null,
        verified: !!(user?.email_confirmed_at || user?.user_metadata?.email_verified),
        emailConfirmedAt: user?.email_confirmed_at || null,
        phoneConfirmedAt: user?.phone_confirmed_at || null,
        error: userError?.message || null
      },
      cookies: {
        count: allCookies.length,
        names: allCookies.map(c => c.name),
        hasAuthCookies: allCookies.some(c => 
          c.name.includes('auth') || 
          c.name.includes('supabase') || 
          c.name.includes('sb-')
        ),
        cookieDetails: allCookies.map(c => ({
          name: c.name,
          hasValue: !!c.value,
          valueLength: c.value?.length || 0
        }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

