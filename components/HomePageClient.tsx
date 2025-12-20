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

type SortBy = 'view_count' | 'created_at';
type SortOrder = 'asc' | 'desc';

interface Recipe {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  description: string | null;
  view_count: number;
  created_at: string;
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
  const [sortBy, setSortBy] = useState<SortBy>('view_count');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  /**
   * Sort and filter recipes
   * First sorts by the selected criteria, then filters by search term
   */
  const sortedAndFilteredRecipes = useMemo(() => {
    // Create a copy to avoid mutating the original array
    let sorted = [...recipes];

    // Sort recipes based on selected criteria
    sorted.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      if (sortBy === 'view_count') {
        aValue = a.view_count;
        bValue = b.view_count;
      } else {
        // Sort by created_at
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    // Filter recipes based on search term
    if (!searchTerm.trim()) {
      return sorted;
    }

    const searchLower = searchTerm.toLowerCase().trim();

    return sorted.filter((recipe) => {
      // Check if title contains the search term
      const titleMatch = recipe.title.toLowerCase().includes(searchLower);

      // Check if any tag contains the search term
      const tagMatch = recipe.tags.some((tag) =>
        tag.toLowerCase().includes(searchLower)
      );

      return titleMatch || tagMatch;
    });
  }, [recipes, searchTerm, sortBy, sortOrder]);

  return (
    <>
      {/* Search bar for finding recipes */}
      <div className="mb-12">
        <SearchBar onSearchChange={setSearchTerm} />
      </div>

      {/* Sort controls */}
      <div className="mb-6 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium opacity-70">Sort by:</span>
            <div className="dropdown dropdown-bottom">
              <label tabIndex={0} className="btn btn-sm btn-outline">
                {sortBy === 'view_count' ? 'View Count' : 'Date Created'}
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </label>
              <ul tabIndex={0} className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-300 z-10">
                <li>
                  <button
                    onClick={() => setSortBy('view_count')}
                    className={sortBy === 'view_count' ? 'active' : ''}
                  >
                    View Count
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setSortBy('created_at')}
                    className={sortBy === 'created_at' ? 'active' : ''}
                  >
                    Date Created
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium opacity-70">Order:</span>
            <div className="btn-group">
              <button
                onClick={() => setSortOrder('desc')}
                className={`btn btn-sm ${sortOrder === 'desc' ? 'btn-primary' : 'btn-outline'}`}
              >
                Descending
              </button>
              <button
                onClick={() => setSortOrder('asc')}
                className={`btn btn-sm ${sortOrder === 'asc' ? 'btn-primary' : 'btn-outline'}`}
              >
                Ascending
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative divider */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-px bg-gradient-to-r from-transparent via-base-300 to-transparent flex-1"></div>
        <span className="text-sm opacity-60 font-mono">RECIPES</span>
        <div className="h-px bg-gradient-to-r from-transparent via-base-300 to-transparent flex-1"></div>
      </div>

      {/* Recipe cards grid with pagination */}
      <RecipeListClient recipes={sortedAndFilteredRecipes} />
    </>
  );
}

