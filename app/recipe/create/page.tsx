/**
 * Recipe Creation/Edit Page Component
 * 
 * Allows authenticated users to create new recipes or edit existing ones with:
 * - Title, description, and tags
 * - Recipe image upload
 * - Dynamic ingredient list (amount, unit, name)
 * - Dynamic method steps
 * - Optional notes
 * 
 * Features:
 * - Automatic slug generation from title
 * - Image upload to Supabase Storage
 * - Unit conversion (volume to weight) for ingredients
 * - Form validation
 * - Error handling
 * - Supports both create and edit modes
 * 
 * This is a Client Component because it needs to:
 * - Handle form state and user interactions
 * - Upload files to Supabase Storage
 * - Navigate after successful creation/update
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { volumeToWeight } from '@/utils/unitConverter';

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
  is_public: boolean;
}

interface Ingredient {
  id: string;
  name: string;
  amount_grams: number;
  unit: string;
  display_amount: number;
  order_index: number;
}

interface RecipeFormProps {
  recipe?: Recipe;
  ingredients?: Ingredient[];
}

export default function RecipeCreatePage() {
  return <RecipeForm />;
}

export function RecipeForm({ recipe, ingredients: initialIngredients }: RecipeFormProps) {
  const router = useRouter();
  const isEditMode = !!recipe;
  
  // Loading state for form submission
  const [loading, setLoading] = useState(false);
  
  // Error message state
  const [error, setError] = useState('');
  
  // Form state - recipe metadata (pre-filled if editing)
  const [title, setTitle] = useState(recipe?.title || '');
  const [description, setDescription] = useState(recipe?.description || '');
  const [tags, setTags] = useState(recipe?.tags.join(', ') || '');
  const [isPublic, setIsPublic] = useState(recipe?.is_public ?? true);
  
  // Form state - recipe content (pre-filled if editing)
  const [methodSteps, setMethodSteps] = useState<string[]>(
    recipe?.method_steps && recipe.method_steps.length > 0 ? recipe.method_steps : ['']
  );
  const [notes, setNotes] = useState<string[]>(
    recipe?.notes && recipe.notes.length > 0 ? recipe.notes : ['']
  );
  
  // Form state - ingredients (pre-filled if editing)
  const [ingredients, setIngredients] = useState<Array<{
    name: string;
    amount: number;
    unit: string;
  }>>(
    initialIngredients && initialIngredients.length > 0
      ? initialIngredients.map(ing => ({
          name: ing.name,
          amount: ing.display_amount,
          unit: ing.unit,
        }))
      : [{ name: '', amount: 0, unit: 'cup' }] // Default to one empty ingredient field
  );
  
  // Form state - image file for upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(recipe?.image_url || null);

  /**
   * Handle form submission
   * Creates a new recipe or updates an existing one in the database
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Step 1: Verify user is authenticated
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        throw new Error(`You must be logged in to ${isEditMode ? 'edit' : 'create'} a recipe`);
      }

      // Step 1b: If editing, verify user is the owner
      if (isEditMode && user.id !== recipe!.user_id) {
        throw new Error('You do not have permission to edit this recipe');
      }

      // Step 1c: Get user's username for slug generation
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.username) {
        throw new Error('User profile not found. Please complete your profile setup.');
      }

      // Step 2: Generate URL-friendly slug from title
      const recipeSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Step 2b: Create full slug with username: username-recipe-slug
      // Convert username to lowercase first, then replace non-alphanumeric characters
      const usernameSlug = profile.username
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, ''); // Remove leading/trailing underscores
      const slug = `${usernameSlug}-${recipeSlug}`;

      // Step 2c: Check for duplicate recipe name for this user (only when creating)
      if (!isEditMode) {
        const { data: existingRecipe } = await supabaseClient
          .from('recipes')
          .select('id')
          .eq('user_id', user.id)
          .eq('slug', slug)
          .single();

        if (existingRecipe) {
          throw new Error('You already have a recipe with this name. Please choose a different name.');
        }
      } else {
        // When editing, check if another recipe with same slug exists (excluding current recipe)
        const { data: existingRecipe } = await supabaseClient
          .from('recipes')
          .select('id')
          .eq('user_id', user.id)
          .eq('slug', slug)
          .neq('id', recipe!.id)
          .single();

        if (existingRecipe) {
          throw new Error('You already have a recipe with this name. Please choose a different name.');
        }
      }

      // Step 3: Upload image to Supabase Storage if provided
      let imageUrl = isEditMode ? recipe!.image_url : null; // Keep existing image by default when editing
      if (imageFile) {
        try {
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabaseClient.storage
            .from('recipe-images')
            .upload(fileName, imageFile);

          if (uploadError) {
            throw new Error(`Image upload failed: ${uploadError.message}`);
          }

          // Get public URL for the uploaded image
          const { data: { publicUrl } } = supabaseClient.storage
            .from('recipe-images')
            .getPublicUrl(fileName);
          
          imageUrl = publicUrl;
        } catch (uploadErr: any) {
          throw new Error(`Failed to upload image: ${uploadErr.message}`);
        }
      }

      if (isEditMode) {
        // Step 4a: Update existing recipe record
        const { error: recipeError } = await supabaseClient
          .from('recipes')
          .update({
            title,
            slug,
            description: description || null,
            image_url: imageUrl,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            method_steps: methodSteps.filter(Boolean),
            notes: notes.filter(Boolean),
            is_public: isPublic,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recipe!.id);

        if (recipeError) {
          throw new Error(`Failed to update recipe: ${recipeError.message}`);
        }

        // Step 5a: Delete existing ingredients
        const { error: deleteError } = await supabaseClient
          .from('ingredients')
          .delete()
          .eq('recipe_id', recipe!.id);

        if (deleteError) {
          throw new Error(`Failed to delete existing ingredients: ${deleteError.message}`);
        }

        // Step 6a: Create new ingredient records
        const ingredientsData = ingredients
          .filter(ing => ing.name && ing.amount > 0)
          .map((ing, index) => {
            const amountGrams = volumeToWeight(ing.amount, ing.unit, ing.name);
            return {
              recipe_id: recipe!.id,
              name: ing.name,
              amount_grams: amountGrams,
              unit: ing.unit,
              display_amount: ing.amount,
              order_index: index,
            };
          });

        if (ingredientsData.length > 0) {
          const { error: ingredientsError } = await supabaseClient
            .from('ingredients')
            .insert(ingredientsData);

          if (ingredientsError) {
            throw new Error(`Failed to save ingredients: ${ingredientsError.message}`);
          }
        }

        // Step 7a: Redirect to the updated recipe page using slug
        router.push(`/recipe/${slug}`);
        router.refresh();
      } else {
        // Step 4b: Create new recipe record
        const { data: newRecipe, error: recipeError } = await supabaseClient
          .from('recipes')
          .insert({
            user_id: user.id,
            title,
            slug,
            description: description || null,
            image_url: imageUrl,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            method_steps: methodSteps.filter(Boolean),
            notes: notes.filter(Boolean),
            is_public: isPublic,
          })
          .select()
          .single();

        if (recipeError) {
          throw new Error(`Failed to create recipe: ${recipeError.message}`);
        }

        if (!newRecipe) {
          throw new Error('Recipe was created but no data was returned');
        }

        // Step 5b: Create ingredient records
        const ingredientsData = ingredients
          .filter(ing => ing.name && ing.amount > 0)
          .map((ing, index) => {
            const amountGrams = volumeToWeight(ing.amount, ing.unit, ing.name);
            return {
              recipe_id: newRecipe.id,
              name: ing.name,
              amount_grams: amountGrams,
              unit: ing.unit,
              display_amount: ing.amount,
              order_index: index,
            };
          });

        if (ingredientsData.length > 0) {
          const { error: ingredientsError } = await supabaseClient
            .from('ingredients')
            .insert(ingredientsData);

          if (ingredientsError) {
            throw new Error(`Failed to save ingredients: ${ingredientsError.message}`);
          }
        }

        // Step 6b: Redirect to the newly created recipe page using slug
        router.push(`/recipe/${slug}`);
      }
    } catch (err: any) {
      // Display error message to user
      setError(err.message || `Failed to ${isEditMode ? 'update' : 'create'} recipe. Please try again.`);
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} recipe:`, err);
    } finally {
      setLoading(false);
    }
  };

  const addMethodStep = () => {
    setMethodSteps([...methodSteps, '']);
  };

  const updateMethodStep = (index: number, value: string) => {
    const newSteps = [...methodSteps];
    newSteps[index] = value;
    setMethodSteps(newSteps);
  };

  const addNote = () => {
    setNotes([...notes, '']);
  };

  const updateNote = (index: number, value: string) => {
    const newNotes = [...notes];
    newNotes[index] = value;
    setNotes(newNotes);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: 0, unit: 'cup' }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      const newIngredients = ingredients.filter((_, i) => i !== index);
      setIngredients(newIngredients);
    }
  };

  const updateIngredient = (index: number, field: string, value: string | number) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);
  };

  const removeMethodStep = (index: number) => {
    if (methodSteps.length > 1) {
      const newSteps = methodSteps.filter((_, i) => i !== index);
      setMethodSteps(newSteps);
    }
  };

  const removeNote = (index: number) => {
    if (notes.length > 1) {
      const newNotes = notes.filter((_, i) => i !== index);
      setNotes(newNotes);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">{isEditMode ? 'Edit Recipe' : 'Create Recipe'}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        {/* Title */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Recipe Title *</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Image */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Recipe Image</span>
          </label>
          {(imagePreview || (isEditMode && recipe?.image_url)) && (
            <div className="mb-2">
              <img
                src={imagePreview || recipe?.image_url || ''}
                alt="Recipe image"
                className="w-64 h-48 object-cover rounded-lg"
              />
              <p className="text-sm opacity-70 mt-1">
                {imagePreview ? 'New image preview' : 'Current image'}
              </p>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="file-input file-input-bordered"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const file = e.target.files?.[0] || null;
              setImageFile(file);
              if (file) {
                // Preview new image
                const reader = new FileReader();
                reader.onload = (e) => {
                  setImagePreview(e.target?.result as string);
                };
                reader.readAsDataURL(file);
              } else {
                setImagePreview(isEditMode ? recipe?.image_url || null : null);
              }
            }}
          />
          {isEditMode && (
            <label className="label">
              <span className="label-text-alt">Leave empty to keep current image</span>
            </label>
          )}
        </div>

        {/* Description */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Description</span>
          </label>
          <textarea
            className="textarea textarea-bordered"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {/* Tags */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Tags (comma-separated)</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={tags}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTags(e.target.value)}
            placeholder="dessert, chocolate, cake"
          />
        </div>

        {/* Public/Private Toggle */}
        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text">Make recipe public</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={isPublic}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsPublic(e.target.checked)}
            />
          </label>
          <label className="label">
            <span className="label-text-alt">Public recipes can be viewed by everyone. Private recipes are only visible to you.</span>
          </label>
        </div>

        {/* Ingredients */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Ingredients</span>
          </label>
          {ingredients.map((ing, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="number"
                step="0.25"
                className="input input-bordered w-24"
                placeholder="Amount"
                value={ing.amount || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateIngredient(index, 'amount', parseFloat(e.target.value) || 0)}
              />
              <select
                className="select select-bordered"
                value={ing.unit}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateIngredient(index, 'unit', e.target.value)}
              >
                <option value="cup">cup</option>
                <option value="cups">cups</option>
                <option value="tsp">teaspoon</option>
                <option value="tbsp">tablespoon</option>
                <option value="ml">ml</option>
              </select>
              <input
                type="text"
                className="input input-bordered flex-1"
                placeholder="Ingredient name"
                value={ing.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateIngredient(index, 'name', e.target.value)}
              />
              {ingredients.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className="btn btn-sm btn-ghost"
                  aria-label="Remove ingredient"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addIngredient}
            className="btn btn-sm btn-outline mt-2"
          >
            + Add Ingredient
          </button>
        </div>

        {/* Method Steps */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Method Steps</span>
          </label>
          {methodSteps.map((step, index) => (
            <div key={index} className="mb-2">
              <div className="flex justify-between items-center mb-1">
                <label className="label">
                  <span className="label-text">Step {index + 1}</span>
                </label>
                {methodSteps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMethodStep(index)}
                    className="btn btn-xs btn-ghost"
                    aria-label="Remove step"
                  >
                    ×
                  </button>
                )}
              </div>
              <textarea
                className="textarea textarea-bordered w-full"
                value={step}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateMethodStep(index, e.target.value)}
                rows={2}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addMethodStep}
            className="btn btn-sm btn-outline mt-2"
          >
            + Add Step
          </button>
        </div>

        {/* Notes */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Notes</span>
          </label>
          {notes.map((note, index) => (
            <div key={index} className="mb-2">
              <div className="flex justify-between items-center mb-1">
                <label className="label">
                  <span className="label-text">Note {index + 1}</span>
                </label>
                {notes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeNote(index)}
                    className="btn btn-xs btn-ghost"
                    aria-label="Remove note"
                  >
                    ×
                  </button>
                )}
              </div>
              <textarea
                className="textarea textarea-bordered w-full"
                value={note}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateNote(index, e.target.value)}
                rows={2}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addNote}
            className="btn btn-sm btn-outline mt-2"
          >
            + Add Note
          </button>
        </div>

        {/* Submit */}
        <div className="form-control mt-6">
          <div className="flex gap-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Recipe' : 'Create Recipe')}
            </button>
            {isEditMode && (
              <button
                type="button"
                onClick={() => router.push(`/recipe/${recipe!.slug}`)}
                className="btn btn-ghost"
                disabled={loading}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

