import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

type RecipeSlugRow = { slug: string; updated_at: string | null };
type ProfileUsernameRow = { username: string; updated_at: string | null };

// Render the sitemap dynamically (per request) so a transient DB issue during
// a build never cascades into breaking the rest of the site.
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

// Hard cap on how long we'll wait for the DB before falling back to static URLs.
const DB_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(fallback);
    }, ms);

    Promise.resolve(promise).then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(fallback);
      }
    );
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://recipealmanac.com';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const staticUrls: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/leaderboard`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  if (!supabaseUrl || !supabaseKey) {
    return staticUrls;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fetchRecipes = async (): Promise<RecipeSlugRow[]> => {
      const { data } = await supabase
        .from('recipes')
        .select('slug, updated_at')
        .eq('is_public', true)
        .order('updated_at', { ascending: false });
      return (data || []) as RecipeSlugRow[];
    };

    const fetchProfiles = async (): Promise<ProfileUsernameRow[]> => {
      const { data } = await supabase
        .from('profiles')
        .select('username, updated_at')
        .order('updated_at', { ascending: false });
      return (data || []) as ProfileUsernameRow[];
    };

    const recipes = await withTimeout<RecipeSlugRow[]>(fetchRecipes(), DB_TIMEOUT_MS, []);
    const profiles = await withTimeout<ProfileUsernameRow[]>(fetchProfiles(), DB_TIMEOUT_MS, []);

    const recipeUrls: MetadataRoute.Sitemap = recipes
      .filter((r) => r.slug)
      .map((recipe) => ({
        url: `${siteUrl}/recipe/${recipe.slug}`,
        lastModified: recipe.updated_at ? new Date(recipe.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      }));

    const profileUrls: MetadataRoute.Sitemap = profiles
      .filter((p) => p.username)
      .map((profile) => ({
        url: `${siteUrl}/profile/${encodeURIComponent(profile.username)}`,
        lastModified: profile.updated_at ? new Date(profile.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.5,
      }));

    return [...staticUrls, ...recipeUrls, ...profileUrls];
  } catch (err) {
    console.error('sitemap fallback (DB unreachable):', err);
    return staticUrls;
  }
}
