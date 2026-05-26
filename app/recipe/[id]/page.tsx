import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase';
import type { RecipeWithProfile } from '@/types';
import RecipeDetailPage from './RecipeDetailPage';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://recipealmanac.com';
  const supabase = await createServerClient();

  const { data: rawRecipe } = await supabase
    .from('recipes')
    .select(`
      title,
      description,
      image_url,
      tags,
      slug,
      profiles:user_id (username)
    `)
    .eq('slug', params.id)
    .eq('is_public', true)
    .single();

  const recipe = rawRecipe as RecipeWithProfile | null;

  if (!recipe) {
    return {
      title: 'Recipe Not Found',
      description: 'This recipe could not be found on Recipe Almanac.',
    };
  }

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
  };
}

export default RecipeDetailPage;
