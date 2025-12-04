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
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('*')
    .eq('recipe_id', params.id)
    .order('order_index');

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

  return (
    <RecipePageClient
      recipe={typedRecipe}
      ingredients={ingredients || []}
      owner={owner}
    />
  );
}

