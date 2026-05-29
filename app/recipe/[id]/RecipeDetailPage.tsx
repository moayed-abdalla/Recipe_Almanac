import { createServerClient } from '@/lib/supabase';
import RecipePageClient from './RecipePageClient';
import type { Recipe, Profile, RecipeWithProfile, Ingredient } from '@/types';
import { getTotalTimeMinutes, minutesToIso8601Duration, toPositiveInt } from '@/utils/recipeTime';

interface RecipeDetailPageProps {
  params: {
    id: string; // Format: username-recipe-slug (treated as slug)
  };
}

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const supabase = await createServerClient();
  
  // Fetch recipe data by slug (format: username-recipe-slug)
  // Note: params.id contains the slug value
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select(`
      *,
      profiles:user_id (
        username,
        avatar_url
      )
    `)
    .eq('slug', params.id)
    .single();

  if (error || !recipe) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>Recipe not found</span>
        </div>
      </div>
    );
  }

  // Type assertion and handle profiles (may be array or single object)
  const typedRecipe = recipe as RecipeWithProfile;
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
  
  // Check if recipe is private and verify access
  if (!typedRecipe.is_public) {
    // Check if current user is the owner
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || user.id !== typedRecipe.user_id) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="alert alert-error">
            <span>This recipe is private and you don't have permission to view it.</span>
          </div>
        </div>
      );
    }
  }
  
  // Fetch ingredients
  const { data: rawIngredients } = await supabase
    .from('ingredients')
    .select('*')
    .eq('recipe_id', typedRecipe.id)
    .order('order_index');
  const ingredients = (rawIngredients || []) as Ingredient[];

  // Check if current user is the recipe owner
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user?.id === typedRecipe.user_id;

  // Viewer preferences: nutrition (logged-in only); temperature unit for step hints.
  let nutritionEnabled = false;
  let preferredTemperatureUnit: 'C' | 'F' | null = null;
  if (user) {
    const { data: viewerProfile } = await supabase
      .from('profiles')
      .select('nutrition_estimation_enabled, default_temperature_unit')
      .eq('id', user.id)
      .single();
    const viewerPrefs = viewerProfile as unknown as
      | {
          nutrition_estimation_enabled?: boolean | null;
          default_temperature_unit?: string | null;
        }
      | null;
    nutritionEnabled = viewerPrefs?.nutrition_estimation_enabled === true;
    preferredTemperatureUnit =
      viewerPrefs?.default_temperature_unit === 'F' ? 'F' : 'C';
  }
  
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
        nutritionEnabled={nutritionEnabled}
        preferredTemperatureUnit={preferredTemperatureUnit}
      />
    </>
  );
}
