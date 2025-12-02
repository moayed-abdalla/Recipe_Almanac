/**
 * Recipe Creation Page Component
 * 
 * Allows authenticated users to create new recipes with:
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
 * 
 * This is a Client Component because it needs to:
 * - Handle form state and user interactions
 * - Upload files to Supabase Storage
 * - Navigate after successful creation
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { volumeToWeight } from '@/utils/unitConverter';

export default function RecipeCreatePage() {
  const router = useRouter();
  
  // Loading state for form submission
  const [loading, setLoading] = useState(false);
  
  // Error message state
  const [error, setError] = useState('');
  
  // Form state - recipe metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  
  // Form state - recipe content
  const [methodSteps, setMethodSteps] = useState<string[]>(['']);
  const [notes, setNotes] = useState<string[]>(['']);
  
  // Form state - ingredients (array of ingredient objects)
  const [ingredients, setIngredients] = useState<Array<{
    name: string;
    amount: number;
    unit: string;
  }>>([{ name: '', amount: 0, unit: 'cup' }]);
  
  // Form state - image file for upload
  const [imageFile, setImageFile] = useState<File | null>(null);

  /**
   * Handle form submission
   * Creates a new recipe in the database with all provided information
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Step 1: Verify user is authenticated
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        throw new Error('You must be logged in to create a recipe');
      }

      // Step 2: Generate URL-friendly slug from title
      // Converts to lowercase, replaces spaces/special chars with hyphens
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Step 3: Upload image to Supabase Storage if provided
      let imageUrl = null;
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

      // Step 4: Create recipe record in database
      const { data: recipe, error: recipeError } = await supabaseClient
        .from('recipes')
        .insert({
          user_id: user.id,
          title,
          slug,
          description: description || null,
          image_url: imageUrl,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean), // Parse comma-separated tags
          method_steps: methodSteps.filter(Boolean), // Remove empty steps
          notes: notes.filter(Boolean), // Remove empty notes
          is_public: true, // New recipes are public by default
        })
        .select()
        .single();

      if (recipeError) {
        throw new Error(`Failed to create recipe: ${recipeError.message}`);
      }

      if (!recipe) {
        throw new Error('Recipe was created but no data was returned');
      }

      // Step 5: Create ingredient records
      // Filter out empty ingredients and convert volumes to weights
      const ingredientsData = ingredients
        .filter(ing => ing.name && ing.amount > 0)
        .map((ing, index) => {
          // Convert volume measurements to weight (grams) for consistency
          const amountGrams = volumeToWeight(ing.amount, ing.unit, ing.name);
          return {
            recipe_id: recipe.id,
            name: ing.name,
            amount_grams: amountGrams,
            unit: ing.unit,
            display_amount: ing.amount,
            order_index: index,
          };
        });

      // Insert ingredients if any were provided
      if (ingredientsData.length > 0) {
        const { error: ingredientsError } = await supabaseClient
          .from('ingredients')
          .insert(ingredientsData);

        if (ingredientsError) {
          throw new Error(`Failed to save ingredients: ${ingredientsError.message}`);
        }
      }

      // Step 6: Redirect to the newly created recipe page
      router.push(`/recipe/${recipe.id}`);
    } catch (err: any) {
      // Display error message to user
      setError(err.message || 'Failed to create recipe. Please try again.');
      console.error('Error creating recipe:', err);
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

  const updateIngredient = (index: number, field: string, value: string | number) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Create Recipe</h1>

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
          <input
            type="file"
            accept="image/*"
            className="file-input file-input-bordered"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setImageFile(e.target.files?.[0] || null)}
          />
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
              <label className="label">
                <span className="label-text">Step {index + 1}</span>
              </label>
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
              <label className="label">
                <span className="label-text">Note {index + 1}</span>
              </label>
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
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Recipe'}
          </button>
        </div>
      </form>
    </div>
  );
}

