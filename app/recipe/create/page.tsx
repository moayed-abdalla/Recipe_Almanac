'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { volumeToWeight } from '@/utils/unitConverter';

export default function RecipeCreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [methodSteps, setMethodSteps] = useState<string[]>(['']);
  const [notes, setNotes] = useState<string[]>(['']);
  const [ingredients, setIngredients] = useState<Array<{
    name: string;
    amount: number;
    unit: string;
  }>>([{ name: '', amount: 0, unit: 'cup' }]);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to create a recipe');
      }

      // Create slug from title
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Upload image if provided
      let imageUrl = null;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabaseClient.storage
          .from('recipe-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabaseClient.storage
          .from('recipe-images')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      // Create recipe
      const { data: recipe, error: recipeError } = await supabaseClient
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
          is_public: true,
        })
        .select()
        .single();

      if (recipeError) throw recipeError;

      // Create ingredients
      const ingredientsData = ingredients
        .filter(ing => ing.name && ing.amount > 0)
        .map((ing, index) => {
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

      if (ingredientsData.length > 0) {
        const { error: ingredientsError } = await supabaseClient
          .from('ingredients')
          .insert(ingredientsData);

        if (ingredientsError) throw ingredientsError;
      }

      // Redirect to recipe page
      router.push(`/recipe/${recipe.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create recipe');
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

  const updateIngredient = (index: number, field: string, value: any) => {
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
            onChange={(e) => setTitle(e.target.value)}
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
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
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
            onChange={(e) => setDescription(e.target.value)}
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
            onChange={(e) => setTags(e.target.value)}
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
                onChange={(e) => updateIngredient(index, 'amount', parseFloat(e.target.value) || 0)}
              />
              <select
                className="select select-bordered"
                value={ing.unit}
                onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
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
                onChange={(e) => updateIngredient(index, 'name', e.target.value)}
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
                onChange={(e) => updateMethodStep(index, e.target.value)}
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
                onChange={(e) => updateNote(index, e.target.value)}
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

