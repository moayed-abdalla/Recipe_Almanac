'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { volumeToWeight, VOLUME_UNITS } from '@/utils/unitConverter';
import { DEFAULT_UNIT } from '@/lib/unit-config';
import type { Recipe, Ingredient } from '@/types';
import type { ParsedRecipeDraft } from '@/lib/recipeTextParser';
import {
  fixSpecialCharacters,
  fixSpecialCharactersInArray,
} from '@/lib/fixSpecialCharacters';
import { SortableFormList } from '@/components/recipe/SortableFormList';
import { newSortableId } from '@/lib/sortableId';
import { revalidateRecipe } from '@/app/recipe/[id]/actions';
import ImageCropModal, { fetchImageAsDataUrl } from '@/components/ui/ImageCropModal';

/**
 * Resize and compress an image file client-side using the Canvas API.
 * Returns a JPEG Blob with the longest edge capped at MAX_EDGE px and
 * quality at QUALITY (0–1). This keeps uploads well under 300 KB for
 * typical phone photos, reducing storage cost and downstream cache weight.
 */
const MAX_EDGE = 1600;
const QUALITY = 0.80;

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > MAX_EDGE || height > MAX_EDGE) {
        if (width >= height) {
          height = Math.round((height * MAX_EDGE) / width);
          width = MAX_EDGE;
        } else {
          width = Math.round((width * MAX_EDGE) / height);
          height = MAX_EDGE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob returned null'));
        },
        'image/jpeg',
        QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = objectUrl;
  });
}

interface MethodStepRow {
  id: string;
  text: string;
  imageUrl: string | null;
  imagePreview: string | null;
  pendingFile: File | null;
}

type CropTarget = 'hero' | { stepIndex: number };

interface RecipeFormProps {
  recipe?: Recipe;
  ingredients?: Ingredient[];
  /** Pre-filled values from the recipe importer (create mode only). */
  draft?: ParsedRecipeDraft;
  /** When true, the form omits its own title row (the importer renders one). */
  hideHeader?: boolean;
}

export function RecipeForm({ recipe, ingredients: initialIngredients, draft, hideHeader }: RecipeFormProps) {
  const router = useRouter();
  const isEditMode = !!recipe;
  const hasDraft = !isEditMode && !!draft;
  
  // Loading state for form submission
  const [loading, setLoading] = useState(false);
  
  // Loading state for delete
  const [deleting, setDeleting] = useState(false);
  
  // Error message state
  const [error, setError] = useState('');
  
  // Form state - recipe metadata (pre-filled if editing or importing)
  const [title, setTitle] = useState(recipe?.title || draft?.title || '');
  const [description, setDescription] = useState(recipe?.description || draft?.description || '');
  const [tags, setTags] = useState(recipe?.tags.join(', ') || draft?.tags || '');
  const [isPublic, setIsPublic] = useState(recipe?.is_public ?? true);
  const [nutritionVisible, setNutritionVisible] = useState(recipe?.nutrition_visible ?? true);

  // Optional servings / timing fields (stored as strings for controlled inputs)
  const [servings, setServings] = useState(recipe?.servings != null ? String(recipe.servings) : (draft?.servings || ''));
  const [prepTime, setPrepTime] = useState(recipe?.prep_time_minutes != null ? String(recipe.prep_time_minutes) : (draft?.prepTime || ''));
  const [cookTime, setCookTime] = useState(recipe?.cook_time_minutes != null ? String(recipe.cook_time_minutes) : (draft?.cookTime || ''));
  
  // Form state - recipe content (pre-filled if editing or importing).
  // Each row carries a stable `id` so dnd-kit can track it across reorders.
  const [methodSteps, setMethodSteps] = useState<MethodStepRow[]>(
    () => {
      const source =
        recipe?.method_steps && recipe.method_steps.length > 0
          ? recipe.method_steps
          : draft?.methodSteps && draft.methodSteps.length > 0
            ? draft.methodSteps
            : [''];
      const imageUrls = recipe?.method_step_image_urls ?? [];
      return source.map((text, i) => {
        const imageUrl = imageUrls[i] ?? null;
        return {
          id: newSortableId(),
          text,
          imageUrl,
          imagePreview: imageUrl,
          pendingFile: null,
        };
      });
    }
  );
  const [notes, setNotes] = useState<Array<{ id: string; text: string }>>(
    () => {
      const source =
        recipe?.notes && recipe.notes.length > 0
          ? recipe.notes
          : draft?.notes && draft.notes.length > 0
            ? draft.notes
            : [''];
      return source.map((text) => ({ id: newSortableId(), text }));
    }
  );
  
  // User's default unit from profile (used when creating new recipes)
  const [defaultUnit, setDefaultUnit] = useState<string>(DEFAULT_UNIT);
  const [hasFetchedDefaultUnit, setHasFetchedDefaultUnit] = useState(false);
  
  // Form state - ingredients (pre-filled if editing or importing).
  // Each row carries a stable `id` so dnd-kit can track it across reorders.
  const [ingredients, setIngredients] = useState<Array<{
    id: string;
    name: string;
    amount: number;
    unit: string;
  }>>(
    initialIngredients && initialIngredients.length > 0
      ? initialIngredients.map(ing => ({
          id: newSortableId(),
          name: ing.name,
          amount: ing.display_amount,
          unit: ing.unit,
        }))
      : draft?.ingredients && draft.ingredients.length > 0
        ? draft.ingredients.map(ing => ({ id: newSortableId(), name: ing.name, amount: ing.amount, unit: ing.unit }))
        : [{ id: newSortableId(), name: '', amount: 0, unit: DEFAULT_UNIT }] // Default to one empty ingredient field
  );

  // Fetch user's default unit from profile when in create mode.
  // Skipped for imports, which already carry parsed units per ingredient.
  useEffect(() => {
    if (isEditMode || hasDraft) return;
    const fetchDefaultUnit = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('default_unit')
        .eq('id', user.id)
        .single();
      if (profile?.default_unit) {
        setDefaultUnit(profile.default_unit);
      }
      setHasFetchedDefaultUnit(true);
    };
    fetchDefaultUnit();
  }, [isEditMode, hasDraft]);

  // Apply user's default unit to empty initial ingredient once profile data is loaded
  useEffect(() => {
    if (isEditMode || hasDraft || !hasFetchedDefaultUnit) return;
    setIngredients(prev => {
      const first = prev[0];
      if (first && first.name === '' && first.amount === 0 && first.unit === DEFAULT_UNIT) {
        return [{ ...first, unit: defaultUnit }, ...prev.slice(1)];
      }
      return prev;
    });
  }, [hasFetchedDefaultUnit, defaultUnit, isEditMode, hasDraft]);
  
  // Form state - image file for upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(recipe?.image_url || null);
  const [cropModalSrc, setCropModalSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);
  const [loadingCropSrc, setLoadingCropSrc] = useState(false);
  const stepFileInputRef = useRef<HTMLInputElement>(null);
  const [stepFileIndex, setStepFileIndex] = useState<number | null>(null);
  const [loadingStepCropIndex, setLoadingStepCropIndex] = useState<number | null>(null);

  /**
   * Handle form submission
   * Creates a new recipe or updates an existing one in the database
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Step 0: Parse and validate optional numeric fields (servings/timing).
      // Empty fields are allowed (stored as null); non-empty values must be
      // non-negative whole numbers.
      const parseOptionalInt = (raw: string, label: string): number | null => {
        const trimmed = raw.trim();
        if (trimmed === '') return null;
        const parsed = Number(trimmed);
        if (!Number.isInteger(parsed) || parsed < 0) {
          throw new Error(`${label} must be a whole number that is zero or greater.`);
        }
        return parsed;
      };
      const servingsValue = parseOptionalInt(servings, 'Servings');
      const prepTimeValue = parseOptionalInt(prepTime, 'Prep time');
      const cookTimeValue = parseOptionalInt(cookTime, 'Cook time');

      // Step 0b: A recipe must have at least one valid ingredient (a name and
      // an amount greater than zero). This mirrors the filter used below for
      // the actual insert so we never create an ingredient-less recipe.
      const validIngredients = ingredients.filter(
        (ing) => ing.name.trim() && ing.amount > 0
      );
      if (validIngredients.length === 0) {
        throw new Error(
          'Please add at least one ingredient with a name and an amount greater than zero.'
        );
      }

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

      // Step 3: Upload hero image to Supabase Storage if provided
      let imageUrl = isEditMode ? recipe!.image_url : null; // Keep existing image by default when editing
      if (imageFile) {
        try {
          const compressed = await compressImage(imageFile);
          const fileName = `${user.id}/${Date.now()}.jpg`;

          const { error: uploadError } = await supabaseClient.storage
            .from('recipe-image')
            .upload(fileName, compressed, { contentType: 'image/jpeg' });

          if (uploadError) {
            throw new Error(`Image upload failed: ${uploadError.message}`);
          }

          const { data: { publicUrl } } = supabaseClient.storage
            .from('recipe-image')
            .getPublicUrl(fileName);
          
          imageUrl = publicUrl;
        } catch (uploadErr: any) {
          throw new Error(`Failed to upload image: ${uploadErr.message}`);
        }
      }

      // Step 3b: Upload pending step images and build aligned arrays
      const keptSteps = methodSteps.filter((s) => s.text.trim());
      const stepsWithUrls: MethodStepRow[] = [];
      for (let i = 0; i < keptSteps.length; i++) {
        const step = keptSteps[i];
        if (step.pendingFile) {
          try {
            const compressed = await compressImage(step.pendingFile);
            const fileName = `${user.id}/step-${Date.now()}-${i}.jpg`;

            const { error: uploadError } = await supabaseClient.storage
              .from('recipe-image')
              .upload(fileName, compressed, { contentType: 'image/jpeg' });

            if (uploadError) {
              throw new Error(`Step ${i + 1} image upload failed: ${uploadError.message}`);
            }

            const { data: { publicUrl } } = supabaseClient.storage
              .from('recipe-image')
              .getPublicUrl(fileName);

            stepsWithUrls.push({ ...step, imageUrl: publicUrl });
          } catch (uploadErr: any) {
            throw new Error(`Failed to upload step ${i + 1} image: ${uploadErr.message}`);
          }
        } else {
          stepsWithUrls.push(step);
        }
      }

      const savedMethodSteps = fixSpecialCharactersInArray(stepsWithUrls.map((s) => s.text));
      const savedStepImageUrls = stepsWithUrls.map((s) => s.imageUrl ?? null);

      if (isEditMode) {
        // Step 4a: Update existing recipe record
        const { error: recipeError } = await supabaseClient
          .from('recipes')
          .update({
            title: fixSpecialCharacters(title),
            slug,
            description: description ? fixSpecialCharacters(description) : null,
            image_url: imageUrl,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            method_steps: savedMethodSteps,
            method_step_image_urls: savedStepImageUrls,
            notes: fixSpecialCharactersInArray(notes.map(n => n.text).filter(Boolean)),
            is_public: isPublic,
            servings: servingsValue,
            prep_time_minutes: prepTimeValue,
            cook_time_minutes: cookTimeValue,
            nutrition_visible: nutritionVisible,
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
            const amountGrams = convertToGrams(ing.amount, ing.unit, ing.name);
            return {
              recipe_id: recipe!.id,
              name: fixSpecialCharacters(ing.name),
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

        // Step 7a: Redirect to the updated recipe page using slug.
        // Use replace() so the back button doesn't return to the edit form.
        // revalidateRecipe() busts the cache up front so the destination is
        // fetched fresh exactly once, instead of replace() + refresh() refetching.
        await revalidateRecipe(slug);
        await router.replace(`/recipe/${slug}`);
      } else {
        // Step 4b: Create new recipe record
        const { data: newRecipe, error: recipeError } = await supabaseClient
          .from('recipes')
          .insert({
            user_id: user.id,
            title: fixSpecialCharacters(title),
            slug,
            description: description ? fixSpecialCharacters(description) : null,
            image_url: imageUrl,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            method_steps: savedMethodSteps,
            method_step_image_urls: savedStepImageUrls,
            notes: fixSpecialCharactersInArray(notes.map(n => n.text).filter(Boolean)),
            is_public: isPublic,
            servings: servingsValue,
            prep_time_minutes: prepTimeValue,
            cook_time_minutes: cookTimeValue,
            nutrition_visible: nutritionVisible,
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
            const amountGrams = convertToGrams(ing.amount, ing.unit, ing.name);
            return {
              recipe_id: newRecipe.id,
              name: fixSpecialCharacters(ing.name),
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
        await router.push(`/recipe/${slug}`);
        router.refresh();
      }
    } catch (err: any) {
      // Display error message to user
      setError(err.message || `Failed to ${isEditMode ? 'update' : 'create'} recipe. Please try again.`);
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} recipe:`, err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle recipe deletion
   * Only available in edit mode for recipe owners
   */
  const handleDelete = async () => {
    if (!recipe) return;
    if (!confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
      return;
    }

    setError('');
    setDeleting(true);

    try {
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        throw new Error('You must be logged in to delete a recipe');
      }
      if (user.id !== recipe.user_id) {
        throw new Error('You do not have permission to delete this recipe');
      }

      const { error: deleteError } = await supabaseClient
        .from('recipes')
        .delete()
        .eq('id', recipe.id);

      if (deleteError) {
        throw new Error(`Failed to delete recipe: ${deleteError.message}`);
      }

      // Redirect to almanac (user's recipe collection)
      await router.replace('/almanac');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete recipe. Please try again.');
      console.error('Error deleting recipe:', err);
    } finally {
      setDeleting(false);
    }
  };

  const addMethodStep = () => {
    setMethodSteps([
      ...methodSteps,
      { id: newSortableId(), text: '', imageUrl: null, imagePreview: null, pendingFile: null },
    ]);
  };

  const updateMethodStep = (index: number, value: string) => {
    const newSteps = [...methodSteps];
    newSteps[index] = { ...newSteps[index], text: value };
    setMethodSteps(newSteps);
  };

  const updateMethodStepImage = (index: number, file: File, previewUrl: string) => {
    const newSteps = [...methodSteps];
    newSteps[index] = {
      ...newSteps[index],
      pendingFile: file,
      imagePreview: previewUrl,
    };
    setMethodSteps(newSteps);
  };

  const removeMethodStepImage = (index: number) => {
    const newSteps = [...methodSteps];
    newSteps[index] = {
      ...newSteps[index],
      pendingFile: null,
      imagePreview: null,
      imageUrl: null,
    };
    setMethodSteps(newSteps);
  };

  const openStepImageCrop = async (index: number) => {
    const step = methodSteps[index];
    const src = step.imagePreview || step.imageUrl;
    if (src) {
      setLoadingStepCropIndex(index);
      try {
        const dataUrl = await fetchImageAsDataUrl(src);
        setCropTarget({ stepIndex: index });
        setCropModalSrc(dataUrl);
      } catch (err) {
        console.error('Failed to load step image for editing:', err);
      } finally {
        setLoadingStepCropIndex(null);
      }
    } else {
      setStepFileIndex(index);
      stepFileInputRef.current?.click();
    }
  };

  const addNote = () => {
    setNotes([...notes, { id: newSortableId(), text: '' }]);
  };

  const updateNote = (index: number, value: string) => {
    const newNotes = [...notes];
    newNotes[index] = { ...newNotes[index], text: value };
    setNotes(newNotes);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { id: newSortableId(), name: '', amount: 0, unit: defaultUnit }]);
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

  /**
   * Convert any unit to grams
   * Handles both volume and weight units
   * "Other" units are not converted - amount is stored as-is (multiplier still applies on display)
   */
  const convertToGrams = (amount: number, unit: string, ingredientName: string): number => {
    const unitLower = unit.toLowerCase();
    
    // "Other" - no conversion, store amount as-is (multiplier will apply when displaying)
    if (unitLower === 'other') {
      return amount;
    }
    
    // Check if it's a volume unit
    if (VOLUME_UNITS[unitLower] !== undefined) {
      return volumeToWeight(amount, unit, ingredientName);
    }
    
    // Handle weight units - convert to grams
    if (unitLower === 'g' || unitLower === 'gram' || unitLower === 'grams') {
      return amount;
    } else if (unitLower === 'kg' || unitLower === 'kilogram' || unitLower === 'kilograms') {
      return amount * 1000;
    } else if (unitLower === 'oz' || unitLower === 'ounce' || unitLower === 'ounces') {
      return amount * 28.35;
    } else if (unitLower === 'lb' || unitLower === 'pound' || unitLower === 'pounds') {
      return amount * 453.592;
    }
    
    // Default: assume grams if unknown
    return amount;
  };

  return (
    <div className={hideHeader ? '' : 'container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-4xl'}>
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">{isEditMode ? 'Edit Recipe' : 'Create Recipe'}</h1>
          {!isEditMode && (
            <Link href="/recipe/import" className="btn btn-outline btn-primary w-full sm:w-auto">
              Import Recipe
            </Link>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        {/* Title */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-lg font-bold">Recipe Title *</span>
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
            <span className="label-text text-lg font-bold">Recipe Image</span>
          </label>
          {(imagePreview || (isEditMode && recipe?.image_url)) && (
            <div className="mb-2">
              <div className="relative inline-block">
                <img
                  src={imagePreview || recipe?.image_url || ''}
                  alt="Recipe image"
                  className="w-full max-w-xs sm:max-w-sm h-40 sm:h-48 object-cover rounded-lg"
                />
                <button
                  type="button"
                  disabled={loadingCropSrc}
                  onClick={async () => {
                    setLoadingCropSrc(true);
                    try {
                      const src = await fetchImageAsDataUrl(imagePreview || recipe?.image_url || '');
                      setCropTarget('hero');
                      setCropModalSrc(src);
                    } catch (err) {
                      console.error('Failed to load image for editing:', err);
                    } finally {
                      setLoadingCropSrc(false);
                    }
                  }}
                  className="absolute top-2 right-2 btn btn-sm btn-neutral gap-1 shadow"
                  title="Edit image"
                >
                  {loadingCropSrc ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L12 16H9v-3z" />
                    </svg>
                  )}
                  Edit
                </button>
              </div>
              <p className="text-sm opacity-70 mt-1">
                {imagePreview && imagePreview !== recipe?.image_url ? 'New image preview' : 'Current image'}
              </p>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="file-input file-input-bordered"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const file = e.target.files?.[0] || null;
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  setCropTarget('hero');
                  setCropModalSrc(ev.target?.result as string);
                };
                reader.readAsDataURL(file);
              } else {
                setImageFile(null);
                setImagePreview(isEditMode ? recipe?.image_url || null : null);
              }
              e.target.value = '';
            }}
          />
          {isEditMode && (
            <label className="label">
              <span className="label-text-alt">Leave empty to keep current image</span>
            </label>
          )}
        </div>

        {cropModalSrc && (
          <ImageCropModal
            imageSrc={cropModalSrc}
            aspect={4 / 3}
            cropShape="rect"
            title={cropTarget === 'hero' ? 'Edit Recipe Image' : 'Edit Step Image'}
            onConfirm={(croppedFile, previewUrl) => {
              if (cropTarget === 'hero') {
                setImageFile(croppedFile);
                setImagePreview(previewUrl);
              } else if (cropTarget && typeof cropTarget === 'object') {
                updateMethodStepImage(cropTarget.stepIndex, croppedFile, previewUrl);
              }
              setCropModalSrc(null);
              setCropTarget(null);
            }}
            onCancel={() => {
              setCropModalSrc(null);
              setCropTarget(null);
            }}
          />
        )}

        <input
          ref={stepFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-hidden="true"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file && stepFileIndex !== null) {
              const reader = new FileReader();
              reader.onload = (ev) => {
                setCropTarget({ stepIndex: stepFileIndex });
                setCropModalSrc(ev.target?.result as string);
                setStepFileIndex(null);
              };
              reader.readAsDataURL(file);
            }
            e.target.value = '';
          }}
        />

        {/* Description */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-lg font-bold">Description</span>
          </label>
          <textarea
            className="textarea textarea-bordered arial-font"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {/* Servings & Timing (all optional) */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-lg font-bold">Servings &amp; Timing</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text">Servings</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                className="input input-bordered w-full"
                placeholder="e.g. 4"
                value={servings}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setServings(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text">Prep time (min)</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                className="input input-bordered w-full"
                placeholder="e.g. 15"
                value={prepTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrepTime(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text">Cook time (min)</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                className="input input-bordered w-full"
                placeholder="e.g. 45"
                value={cookTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCookTime(e.target.value)}
              />
            </div>
          </div>
          <label className="label">
            <span className="label-text-alt">All optional. Leave blank if not applicable.</span>
          </label>
        </div>

        {/* Tags */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-lg font-bold">Tags (comma-separated)</span>
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

        {/* Nutrition Estimate Toggle */}
        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text">Show nutrition estimate on this recipe</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={nutritionVisible}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNutritionVisible(e.target.checked)}
            />
          </label>
          <label className="label">
            <span className="label-text-alt">When on, viewers who have enabled nutrition estimation can see an approximate, experimental breakdown based on ingredient amounts.</span>
          </label>
        </div>

        {/* Ingredients */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-lg font-bold">Ingredients</span>
          </label>
          <SortableFormList
            items={ingredients}
            onReorder={setIngredients}
            itemClassName="flex flex-row flex-wrap items-center gap-2 mb-2 group w-full min-w-0"
            gripLabel={(index) => `Reorder ingredient ${index + 1}`}
            renderItem={(ing, index, handle) => {
              const isOtherUnit = ing.unit === 'other';
              return (
            <>
              {handle}
              <input
                type="number"
                step="0.25"
                className="input input-bordered input-sm w-[4.25rem] flex-shrink-0"
                placeholder="Amt"
                value={ing.amount || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateIngredient(index, 'amount', parseFloat(e.target.value) || 0)}
              />
              <select
                className={`select select-bordered select-sm flex-shrink-0 ${isOtherUnit ? 'w-10 min-w-[2.5rem] text-transparent' : 'w-[5.25rem]'}`}
                value={ing.unit}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateIngredient(index, 'unit', e.target.value)}
                aria-label={isOtherUnit ? 'Unit of measure: other' : 'Unit of measure'}
              >
                <optgroup label="Weight - Metric">
                  <option value="g">g (grams)</option>
                  <option value="kg">kg (kilograms)</option>
                </optgroup>
                <optgroup label="Weight - Imperial">
                  <option value="oz">oz (ounces)</option>
                  <option value="lb">lb (pounds)</option>
                </optgroup>
                <optgroup label="Volume">
                  <option value="cups">cups</option>
                  <option value="tbsp">tbsp (tablespoon)</option>
                  <option value="tsp">tsp (teaspoon)</option>
                  <option value="ml">ml (milliliters)</option>
                  <option value="fl oz">fl oz (fluid ounces)</option>
                  <option value="l">l (liters)</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="other">Other</option>
                </optgroup>
              </select>
              <input
                type="text"
                className="input input-bordered input-sm flex-1 min-w-[5rem]"
                placeholder="Ingredient name"
                value={ing.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateIngredient(index, 'name', e.target.value)}
              />
              {ingredients.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className="btn btn-lg btn-ghost btn-square text-3xl leading-none flex-shrink-0"
                  aria-label="Remove ingredient"
                >
                  ×
                </button>
              )}
            </>
              );
            }}
          />
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
            <span className="label-text text-lg font-bold">Method Steps</span>
          </label>
          <SortableFormList
            items={methodSteps}
            onReorder={setMethodSteps}
            itemClassName="mb-2 flex items-start gap-2"
            gripClassName="mt-3"
            gripLabel={(index) => `Reorder step ${index + 1}`}
            renderItem={(step, index, handle) => {
              const stepImageSrc = step.imagePreview || step.imageUrl;
              return (
            <>
              {handle}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <label className="label">
                    <span className="label-text">Step {index + 1}</span>
                  </label>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => openStepImageCrop(index)}
                      disabled={loadingStepCropIndex === index}
                      className="btn btn-xs btn-ghost"
                      aria-label={stepImageSrc ? `Edit image for step ${index + 1}` : `Add image to step ${index + 1}`}
                      title={stepImageSrc ? 'Edit step image' : 'Add step image'}
                    >
                      {loadingStepCropIndex === index ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                    {methodSteps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMethodStep(index)}
                        className="btn btn-md btn-ghost text-2xl leading-none"
                        aria-label="Remove step"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  className="textarea textarea-bordered w-full arial-font"
                  value={step.text}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateMethodStep(index, e.target.value)}
                  rows={2}
                />
                {stepImageSrc && (
                  <div className="relative inline-block mt-2">
                    <img
                      src={stepImageSrc}
                      alt={`Step ${index + 1} preview`}
                      className="h-20 w-28 object-cover rounded-lg border border-base-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeMethodStepImage(index)}
                      className="absolute -top-2 -right-2 btn btn-xs btn-circle btn-error"
                      aria-label={`Remove image from step ${index + 1}`}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </>
              );
            }}
          />
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
            <span className="label-text text-lg font-bold">Notes</span>
          </label>
          <SortableFormList
            items={notes}
            onReorder={setNotes}
            itemClassName="mb-2 flex items-start gap-2"
            gripClassName="mt-3"
            gripLabel={(index) => `Reorder note ${index + 1}`}
            renderItem={(note, index, handle) => (
            <>
              {handle}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <label className="label">
                    <span className="label-text">Note {index + 1}</span>
                  </label>
                  {notes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeNote(index)}
                      className="btn btn-md btn-ghost text-2xl leading-none"
                      aria-label="Remove note"
                    >
                      ×
                    </button>
                  )}
                </div>
                <textarea
                  className="textarea textarea-bordered w-full arial-font"
                  value={note.text}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateNote(index, e.target.value)}
                  rows={2}
                />
              </div>
            </>
            )}
          />
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
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              className="btn btn-primary w-full sm:w-auto"
              disabled={loading || deleting}
            >
              {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Recipe' : 'Create Recipe')}
            </button>
            {isEditMode && (
              <button
                type="button"
                onClick={() => router.push(`/recipe/${recipe!.slug}`)}
                className="btn btn-ghost w-full sm:w-auto"
                disabled={loading || deleting}
              >
                Cancel
              </button>
            )}
          </div>

          {isEditMode && (
            <>
              <div className="divider my-8" />
              <div className="border border-error/30 rounded-lg p-4 bg-error/5">
              <p className="text-sm font-medium text-error mb-2">Danger zone</p>
              <p className="text-sm opacity-80 mb-3">
                Deleting this recipe is permanent and cannot be undone. All ingredients, method steps, and notes will be removed.
              </p>
              <button
                type="button"
                onClick={handleDelete}
                className="btn btn-error btn-outline btn-sm"
                disabled={loading || deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Recipe'}
              </button>
            </div>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

