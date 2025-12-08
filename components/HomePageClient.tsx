/**
 * Home Page Client Wrapper Component
 * 
 * Manages search state and filters recipes based on search term.
 * Filters recipes by:
 * - Title substring match (case-insensitive)
 * - Tag substring match (case-insensitive)
 * 
 * This is a Client Component because it needs to:
 * - Manage search state
 * - Filter recipes in real-time
 * - Handle user interactions
 */

'use client';

import { useState, useMemo } from 'react';
import SearchBar from './SearchBar';
import RecipeListClient from './RecipeListClient';

interface Recipe {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  description: string | null;
  view_count: number;
  tags: string[];
  profiles: {
    username: string;
  };
}

interface HomePageClientProps {
  recipes: Recipe[];
}

export default function HomePageClient({ recipes }: HomePageClientProps) {
  const [searchTerm, setSearchTerm] = useState('');

  /**
   * Filter recipes based on search term
   * Matches if:
   * - Recipe title contains the search term (case-insensitive)
   * - Any tag contains the search term (case-insensitive)
   */
  const filteredRecipes = useMemo(() => {
    if (!searchTerm.trim()) {
      return recipes;
    }

    const searchLower = searchTerm.toLowerCase().trim();

    return recipes.filter((recipe) => {
      // Check if title contains the search term
      const titleMatch = recipe.title.toLowerCase().includes(searchLower);

      // Check if any tag contains the search term
      const tagMatch = recipe.tags.some((tag) =>
        tag.toLowerCase().includes(searchLower)
      );

      return titleMatch || tagMatch;
    });
  }, [recipes, searchTerm]);

  return (
    <>
      {/* Search bar for finding recipes */}
      <div className="mb-12">
        <SearchBar onSearchChange={setSearchTerm} />
      </div>

      {/* Decorative divider */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-px bg-gradient-to-r from-transparent via-base-300 to-transparent flex-1"></div>
        <span className="text-sm opacity-60 font-mono">RECIPES</span>
        <div className="h-px bg-gradient-to-r from-transparent via-base-300 to-transparent flex-1"></div>
      </div>

      {/* Recipe cards grid with pagination */}
      <RecipeListClient recipes={filteredRecipes} />
    </>
  );
}

