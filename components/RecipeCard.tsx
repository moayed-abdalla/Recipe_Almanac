/**
 * Recipe Card Component
 * 
 * Displays a preview card for a recipe with:
 * - Recipe image (or placeholder)
 * - Recipe title
 * - Description (truncated)
 * - Author username
 * - View count
 * - Tags (up to 3)
 * - Fork button (for logged-in users)
 * 
 * Clicking the card navigates to the full recipe page.
 * The fork button allows users to create their own version of the recipe.
 * 
 * This is a Client Component because it needs to:
 * - Handle user interactions (fork button)
 * - Check authentication state
 * - Navigate to recipe pages
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase-client';

interface RecipeCardProps {
  id: string;
  title: string;
  imageUrl?: string | null;
  description?: string | null;
  username: string;
  viewCount: number;
  tags?: string[];
}

export default function RecipeCard({
  id,
  title,
  imageUrl,
  description,
  username,
  viewCount,
  tags = [],
}: RecipeCardProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  /**
   * Handle fork button click
   * Creates a copy of the recipe that the user can then edit
   * Only available to logged-in users
   */
  const handleFork = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Redirect to login if user is not authenticated
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      // Step 1: Fetch the original recipe with all its data
      const { data: originalRecipe, error: fetchError } = await supabaseClient
        .from('recipes')
        .select('*, ingredients(*)')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Error fetching recipe:', fetchError);
        alert('Failed to fetch recipe. Please try again.');
        return;
      }

      if (!originalRecipe) {
        console.error('Recipe not found');
        alert('Recipe not found.');
        return;
      }

      // Step 2: Create a new recipe based on the original
      // Add "(Forked)" to the title and create a unique slug
      const { data: newRecipe, error: createError } = await supabaseClient
        .from('recipes')
        .insert({
          user_id: user.id,
          title: `${originalRecipe.title} (Forked)`,
          slug: `${originalRecipe.slug}-forked-${Date.now()}`,
          description: originalRecipe.description,
          image_url: originalRecipe.image_url, // Forked recipes can use the same image
          tags: originalRecipe.tags,
          method_steps: originalRecipe.method_steps,
          notes: originalRecipe.notes,
          is_public: true,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating forked recipe:', createError);
        alert('Failed to create forked recipe. Please try again.');
        return;
      }

      if (!newRecipe) {
        console.error('Forked recipe was created but no data was returned');
        alert('Recipe was forked but there was an error. Please try again.');
        return;
      }

      // Step 3: Copy all ingredients to the new recipe
      if (originalRecipe.ingredients && originalRecipe.ingredients.length > 0) {
        const ingredientsData = originalRecipe.ingredients.map((ing: any) => ({
          recipe_id: newRecipe.id,
          name: ing.name,
          amount_grams: ing.amount_grams,
          unit: ing.unit,
          display_amount: ing.display_amount,
          order_index: ing.order_index,
        }));

        const { error: ingredientsError } = await supabaseClient
          .from('ingredients')
          .insert(ingredientsData);

        if (ingredientsError) {
          console.error('Error copying ingredients:', ingredientsError);
          // Recipe was created but ingredients failed - still navigate to recipe
          // User can manually add ingredients if needed
        }
      }

      // Step 4: Navigate to the newly forked recipe page
      router.push(`/recipe/${newRecipe.id}`);
    } catch (err) {
      console.error('Unexpected error forking recipe:', err);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow relative">
      <Link href={`/recipe/${id}`}>
        <figure>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              width={400}
              height={300}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-base-300 flex items-center justify-center">
              <span className="text-base-content opacity-50">No Image</span>
            </div>
          )}
        </figure>
        <div className="card-body">
          <h2 className="card-title">{title}</h2>
          {description && (
            <p className="text-sm opacity-70 line-clamp-2">{description}</p>
          )}
          <div className="card-actions justify-between items-center mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-60">by {username}</span>
              <span className="text-sm opacity-60">•</span>
              <span className="text-sm opacity-60">{viewCount} views</span>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="badge badge-outline badge-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>
      {user && (
        <button
          onClick={handleFork}
          className="absolute top-2 right-2 btn btn-sm btn-circle btn-ghost bg-base-100/80 hover:bg-base-100"
          aria-label="Fork recipe"
          title="Create your own version"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

