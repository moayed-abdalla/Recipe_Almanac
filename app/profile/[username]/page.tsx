import { createServerClient } from '@/lib/supabase';
import { notFound } from 'next/navigation';

interface ProfilePageProps {
  params: {
    username: string;
  };
}

interface Profile {
  id: string;
  username: string;
  profile_description: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = await createServerClient();

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', params.username)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  // Type assertion to help TypeScript
  const typedProfile = profile as Profile;

  // Fetch user's recipes
  const { data: recipes } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', typedProfile.id)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="card bg-base-200 shadow-xl mb-8">
          <div className="card-body">
            <div className="flex items-center gap-4">
              <div className="avatar">
                <div className="w-24 rounded-full bg-base-300">
                  {typedProfile.avatar_url ? (
                    <img
                      src={typedProfile.avatar_url}
                      alt={typedProfile.username}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-base-300 flex items-center justify-center">
                      <span className="text-2xl font-bold">
                        {typedProfile.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold">{typedProfile.username}</h1>
                {typedProfile.profile_description && (
                  <p className="mt-2">{typedProfile.profile_description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User's Recipes */}
        <h2 className="text-2xl font-bold mb-4">Recipes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes?.map((recipe) => (
            <a
              key={recipe.id}
              href={`/recipe/${recipe.id}`}
              className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow"
            >
              <div className="card-body">
                <h3 className="card-title">{recipe.title}</h3>
                {recipe.description && (
                  <p className="text-sm opacity-70 line-clamp-2">
                    {recipe.description}
                  </p>
                )}
                <div className="card-actions justify-end mt-4">
                  <span className="text-sm opacity-60">
                    {recipe.view_count} views
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

