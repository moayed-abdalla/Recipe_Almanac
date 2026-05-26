import type { MetadataRoute } from 'next';
import { createServerClient } from '@/lib/supabase';

type RecipeSlugRow = { slug: string; updated_at: string };
type ProfileUsernameRow = { username: string; updated_at: string };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://recipealmanac.com';

  const supabase = await createServerClient();

  const [recipesResult, profilesResult] = await Promise.all([
    supabase
      .from('recipes')
      .select('slug, updated_at')
      .eq('is_public', true)
      .order('updated_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('username, updated_at')
      .order('updated_at', { ascending: false }),
  ]);

  const recipes = (recipesResult.data || []) as RecipeSlugRow[];
  const profiles = (profilesResult.data || []) as ProfileUsernameRow[];

  const recipeUrls: MetadataRoute.Sitemap = recipes.map((recipe) => ({
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

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    ...recipeUrls,
    ...profileUrls,
  ];
}
