import { createServerClient } from '@/lib/supabase';
import RecipePageClient from './RecipePageClient';

interface RecipePageProps {
  params: {
    id: string;
  };
}

interface Recipe {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  tags: string[];
  method_steps: string[];
  notes: string[];
  view_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface Profile {
  username: string;
  avatar_url: string | null;
}

interface RecipeWithProfile extends Recipe {
  profiles: Profile | Profile[] | null;
}

export default async function RecipePage({ params }: RecipePageProps) {
  const supabase = await createServerClient();
  
  // Fetch recipe data
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select(`
      *,
      profiles:user_id (
        username,
        avatar_url
      )
    `)
    .eq('id', params.id)
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

  // Type assertion
  const typedRecipe = recipe as RecipeWithProfile;
  const owner = Array.isArray(typedRecipe.profiles) 
    ? typedRecipe.profiles[0] 
    : typedRecipe.profiles;

  if (!owner) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>Recipe owner not found</span>
        </div>
      </div>
    );
  }

  // Fetch ingredients
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('*')
    .eq('recipe_id', params.id)
    .order('order_index');

  // Increment view count (fire and forget)
  // Using type assertion since RPC function might not be in Database type yet
  (supabase.rpc as any)('increment_recipe_views', { recipe_uuid: params.id }).catch(() => {
    // Silently fail if RPC doesn't exist yet
  });

  return (
    <RecipePageClient
      recipe={typedRecipe}
      ingredients={ingredients || []}
      owner={owner}
    />
  );
}

