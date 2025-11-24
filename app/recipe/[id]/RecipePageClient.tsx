'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { formatMeasurement, convertUnit } from '@/utils/unitConverter';

interface Ingredient {
  id: string;
  name: string;
  amount_grams: number;
  unit: string;
  display_amount: number;
  order_index: number;
}

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  tags: string[];
  method_steps: string[];
  notes: string[];
  view_count: number;
}

interface Owner {
  username: string;
  avatar_url: string | null;
}

interface RecipePageClientProps {
  recipe: Recipe;
  ingredients: Ingredient[];
  owner: Owner;
}

export default function RecipePageClient({
  recipe,
  ingredients,
  owner,
}: RecipePageClientProps) {
  const [unitSystem, setUnitSystem] = useState<'volume' | 'weight'>('volume');
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());

  const toggleIngredient = (id: string) => {
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedIngredients(newChecked);
  };

  const toggleUnitSystem = () => {
    setUnitSystem(unitSystem === 'volume' ? 'weight' : 'volume');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Recipe Image */}
      {recipe.image_url && (
        <div className="mb-8">
          <Image
            src={recipe.image_url}
            alt={recipe.title}
            width={800}
            height={600}
            className="w-full h-96 object-cover rounded-lg"
          />
        </div>
      )}

      {/* Recipe Title and Owner */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">{recipe.title}</h1>
        <div className="flex items-center gap-2">
          <span className="text-lg opacity-70">by</span>
          <Link
            href={`/profile/${owner.username}`}
            className="link link-primary text-lg"
          >
            {owner.username}
          </Link>
        </div>
        <div className="mt-2 text-sm opacity-60">
          {recipe.view_count} views
        </div>
      </div>

      {/* Tags */}
      {recipe.tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {recipe.tags.map((tag, index) => (
            <span
              key={index}
              className="badge badge-outline"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      {recipe.description && (
        <p className="mb-8 text-lg">{recipe.description}</p>
      )}

      {/* Ingredients Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Ingredients</h2>
          <button
            onClick={toggleUnitSystem}
            className="btn btn-sm btn-outline"
          >
            Switch to {unitSystem === 'volume' ? 'Weight (g)' : 'Volume'}
          </button>
        </div>
        <ul className="space-y-2">
          {ingredients.map((ingredient) => {
            const displayAmount =
              unitSystem === 'volume'
                ? ingredient.display_amount
                : convertUnit(
                    ingredient.amount_grams,
                    'g',
                    ingredient.unit,
                    ingredient.name
                  );
            const displayUnit = unitSystem === 'volume' ? ingredient.unit : 'g';
            const isChecked = checkedIngredients.has(ingredient.id);

            return (
              <li key={ingredient.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleIngredient(ingredient.id)}
                  className="checkbox"
                />
                <span
                  className={isChecked ? 'line-through opacity-50' : ''}
                >
                  {formatMeasurement(displayAmount, displayUnit)} {ingredient.name}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Method Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Method</h2>
        <ol className="list-decimal list-inside space-y-3">
          {recipe.method_steps.map((step, index) => (
            <li key={index} className="text-lg">
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Notes Section */}
      {recipe.notes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Notes</h2>
          <ol className="list-decimal list-inside space-y-2">
            {recipe.notes.map((note, index) => (
              <li key={index} className="opacity-80">
                {note}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

