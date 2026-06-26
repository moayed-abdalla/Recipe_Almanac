import { createServerClient } from '@/lib/supabase';
import { getRecipeBySlug } from '@/lib/recipeServer';
import { INGREDIENT_SELECT } from '@/lib/recipeQueries';
import RecipePageClient from './RecipePageClient';
import type { Profile, RecipeWithProfile, Ingredient } from '@/types';
import type { RecipeCopySource } from '@/lib/recipeCopyAttribution';
import { getTotalTimeMinutes, minutesToIso8601Duration, toPositiveInt } from '@/utils/recipeTime';

interface RecipeDetailPageProps {
  params: {
    id: string; // Format: username-recipe-slug (treated as slug)
  };
}

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  // Shared, request-cached fetch (see lib/recipeServer.ts) — also used by
  // generateMetadata in page.tsx, so the slug is only queried once per request.
  const typedRecipe = await getRecipeBySlug(params.id);

  if (!typedRecipe) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>Recipe not found</span>
        </div>
      </div>
    );
  }

  // Handle profiles (may be array or single object)
  let owner: Profile | null = null;
  
  if (Array.isArray(typedRecipe.profiles)) {
    owner = typedRecipe.profiles[0] || null;
  } else {
    owner = typedRecipe.profiles;
  }

  if (!owner) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>Recipe owner not found</span>
        </div>
      </div>
    );
  }
  
  // Ensure owner has required fields
  if (!owner.username) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>Recipe owner information is incomplete</span>
        </div>
      </div>
    );
  }
  
  // One auth resolution for the whole render: the privacy gate, owner controls,
  // and viewer-specific data all derive from this single getUser() call.
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Private recipes are only visible to their owner.
  if (!typedRecipe.is_public && (!user || user.id !== typedRecipe.user_id)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>This recipe is private and you don&apos;t have permission to view it.</span>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === typedRecipe.user_id;

  const copySourcePromise = typedRecipe.copied_from_recipe_id
    ? supabase
        .from('recipes')
        .select('slug, title')
        .eq('id', typedRecipe.copied_from_recipe_id)
        .maybeSingle()
    : Promise.resolve({ data: null });

  // Independent secondary reads run together instead of in a waterfall:
  // ingredients, the viewer's preferences, their favorite status, the
  // recipe's rating summary, and copy attribution source.
  const [ingredientsResult, viewerProfileResult, favoriteResult, ratingStatsResult, copySourceResult] =
    await Promise.all([
      supabase
        .from('ingredients')
        .select(INGREDIENT_SELECT)
        .eq('recipe_id', typedRecipe.id)
        .order('order_index'),
      user
        ? supabase
            .from('profiles')
            .select('nutrition_estimation_enabled, default_temperature_unit')
            .eq('id', user.id)
            .single()
        : Promise.resolve({ data: null }),
      user
        ? supabase
            .from('saved_recipes')
            .select('id')
            .eq('user_id', user.id)
            .eq('recipe_id', typedRecipe.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from('recipe_rating_stats')
        .select('rating_count, average_rating')
        .eq('recipe_id', typedRecipe.id)
        .maybeSingle(),
      copySourcePromise,
    ]);

  const ingredients = (ingredientsResult.data || []) as Ingredient[];

  // Viewer preferences: nutrition (logged-in only); temperature unit for step hints.
  const viewerPrefs = viewerProfileResult.data as
    | {
        nutrition_estimation_enabled?: boolean | null;
        default_temperature_unit?: string | null;
      }
    | null;
  const nutritionEnabled = viewerPrefs?.nutrition_estimation_enabled === true;
  // null = signed out (client then shows all temperature conversions).
  const preferredTemperatureUnit: 'C' | 'F' | null = user
    ? viewerPrefs?.default_temperature_unit === 'F'
      ? 'F'
      : 'C'
    : null;

  const initialIsFavorited = Boolean(favoriteResult.data);

  const ratingStatsRow = ratingStatsResult.data as
    | { rating_count: number | null; average_rating: number | null }
    | null;
  const initialRatingStats = ratingStatsRow
    ? {
        ratingCount: Number(ratingStatsRow.rating_count) || 0,
        averageRating: Number(ratingStatsRow.average_rating) || 0,
      }
    : null;

  const copySourceRow = copySourceResult.data as
    | { slug: string; title: string }
    | null;
  const copySource: RecipeCopySource | null = copySourceRow
    ? { slug: copySourceRow.slug, title: copySourceRow.title }
    : null;
  
  // Debug logging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('[RecipePage] Owner check:', {
      userId: user?.id,
      recipeUserId: typedRecipe.user_id,
      isOwner,
      recipeSlug: typedRecipe.slug,
    });
  }

  // Increment view count (fire and forget)
  // Use direct update instead of RPC function for reliability
  // Use proper Database type for the update
  // COMMENTED OUT: View count feature disabled
  // const updateData: Database['public']['Tables']['recipes']['Update'] = { 
  //   view_count: (typedRecipe.view_count || 0) + 1 
  // };
  
  // supabase
  //   .from('recipes')
  //   //.update(updateData)
  //   .eq('id', params.id)
  //   .then(() => {
  //     // Success - view count updated
  //   })
  //   .catch((err) => {
  //     // Silently fail if update doesn't work
  //     console.error('Error incrementing view count:', err);
  //   });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://recipealmanac.xyz';

  // Optional servings / timing fields. Each is only added to the structured
  // data when a usable positive value is present.
  const servingsValue = toPositiveInt(typedRecipe.servings);
  const prepIso = minutesToIso8601Duration(typedRecipe.prep_time_minutes);
  const cookIso = minutesToIso8601Duration(typedRecipe.cook_time_minutes);
  const totalTimeMinutes = getTotalTimeMinutes(
    typedRecipe.prep_time_minutes,
    typedRecipe.cook_time_minutes
  );
  const totalIso =
    typedRecipe.prep_time_minutes != null && typedRecipe.cook_time_minutes != null
      ? minutesToIso8601Duration(totalTimeMinutes)
      : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: typedRecipe.title,
    description: typedRecipe.description ?? undefined,
    image: typedRecipe.image_url ? [typedRecipe.image_url] : undefined,
    author: {
      '@type': 'Person',
      name: owner.username,
      url: `${siteUrl}/profile/${encodeURIComponent(owner.username)}`,
    },
    datePublished: typedRecipe.created_at,
    dateModified: typedRecipe.updated_at,
    recipeYield: servingsValue
      ? `${servingsValue} ${servingsValue === 1 ? 'serving' : 'servings'}`
      : undefined,
    prepTime: prepIso,
    cookTime: cookIso,
    totalTime: totalIso,
    recipeIngredient: ingredients.map(
      (ing) => `${ing.display_amount} ${ing.unit} ${ing.name}`
    ),
    recipeInstructions: (typedRecipe.method_steps || []).map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text: step,
    })),
    keywords: (typedRecipe.tags || []).join(', '),
    url: `${siteUrl}/recipe/${typedRecipe.slug}`,
    publisher: {
      '@type': 'Organization',
      name: 'Recipe Almanac',
      url: siteUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RecipePageClient
        recipe={typedRecipe}
        ingredients={ingredients}
        owner={owner}
        isOwner={isOwner}
        viewerId={user?.id ?? null}
        initialIsFavorited={initialIsFavorited}
        initialRatingStats={initialRatingStats}
        nutritionEnabled={nutritionEnabled}
        preferredTemperatureUnit={preferredTemperatureUnit}
        copySource={copySource}
      />
    </>
  );
}
