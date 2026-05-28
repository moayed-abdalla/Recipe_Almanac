import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase';
import type { RecipeWithProfile } from '@/types';
import RecipeDetailPage from './RecipeDetailPage';

// Always render on demand so metadata generation doesn't get stuck in
// a stale prerender or fail the build when Supabase is unreachable.
export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://recipealmanac.xyz';

  // Wrap the whole metadata fetch in a try/catch so a metadata failure can
  // never break the route itself — the page will still render via the default
  // export below.
  let recipe: RecipeWithProfile | null = null;
  try {
    const supabase = await createServerClient();
    const { data: rawRecipe } = await supabase
      .from('recipes')
      .select(`
        title,
        description,
        image_url,
        tags,
        slug,
        is_public,
        profiles:user_id (username)
      `)
      .eq('slug', params.id)
      .single();

    recipe = rawRecipe as RecipeWithProfile | null;
  } catch (err) {
    console.error('generateMetadata fetch failed:', err);
  }

  if (!recipe) {
    return {
      title: 'Recipe Not Found',
      description: 'This recipe could not be found on Recipe Almanac.',
      robots: { index: false, follow: false },
    };
  }

  // Private recipes should not be indexed — but we still serve metadata for
  // the owner's own preview/share use.
  const isPrivate = recipe.is_public === false;

  const profile = Array.isArray(recipe.profiles) ? recipe.profiles[0] : recipe.profiles;
  const authorName = profile?.username ?? 'Recipe Almanac';
  const title = recipe.title;
  const description =
    recipe.description ||
    `${title} — a recipe by ${authorName} on Recipe Almanac, your digital cookbook.`;
  const canonicalUrl = `${siteUrl}/recipe/${recipe.slug}`;

  const images = recipe.image_url
    ? [
        {
          url: recipe.image_url,
          width: 1200,
          height: 630,
          alt: `${title} — recipe photo`,
        },
      ]
    : [
        {
          url: `${siteUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: 'Recipe Almanac',
        },
      ];

  return {
    title,
    description,
    keywords: [
      title,
      ...(recipe.tags || []),
      `${title} recipe`,
      `${authorName} recipe`,
      'Recipe Almanac',
      'digital recipe book',
    ],
    authors: [{ name: authorName }],
    openGraph: {
      type: 'article',
      url: canonicalUrl,
      title: `${title} — Recipe Almanac`,
      description,
      images,
      siteName: 'Recipe Almanac',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} — Recipe Almanac`,
      description,
      images: recipe.image_url ? [recipe.image_url] : [`${siteUrl}/og-image.png`],
    },
    alternates: {
      canonical: canonicalUrl,
    },
    ...(isPrivate ? { robots: { index: false, follow: false } } : {}),
  };
}

export default RecipeDetailPage;
