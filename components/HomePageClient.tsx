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

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);

const maxDistanceForLength = (length: number) => {
  if (length <= 4) return 1;
  if (length <= 7) return 2;
  return Math.min(3, Math.max(2, Math.floor(length * 0.34)));
};

const levenshtein = (a: string, b: string, maxDistance: number) => {
  if (a === b) return 0;
  const lengthDiff = Math.abs(a.length - b.length);
  if (lengthDiff > maxDistance) return maxDistance + 1;

  const rows = new Array(a.length + 1).fill(0);
  const cols = new Array(b.length + 1).fill(0);
  for (let i = 0; i <= a.length; i++) rows[i] = i;
  for (let j = 0; j <= b.length; j++) cols[j] = j;

  for (let i = 1; i <= a.length; i++) {
    let rowMin = rows[i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const next = Math.min(
        rows[j] + 1,
        cols[j - 1] + 1,
        rows[j - 1] + cost
      );
      cols[j] = next;
      rowMin = Math.min(rowMin, next);
    }
    if (rowMin > maxDistance) return maxDistance + 1;
    for (let j = 0; j <= b.length; j++) {
      rows[j] = cols[j];
    }
  }

  return rows[b.length];
};

const fuzzyMatch = (query: string, candidate: string) => {
  if (!candidate) return false;
  if (candidate.includes(query)) return true;

  const queryTokens = tokenize(query);
  const candidateTokens = tokenize(candidate);
  if (candidateTokens.length === 0) return false;

  const tokenMatch = (token: string) => {
    if (!token) return false;
    const tokenMaxDistance = maxDistanceForLength(token.length);
    return candidateTokens.some((candidateToken) => {
      if (candidateToken.includes(token)) return true;
      return (
        levenshtein(token, candidateToken, tokenMaxDistance) <= tokenMaxDistance
      );
    });
  };

  if (queryTokens.length > 1) {
    return queryTokens.every(tokenMatch);
  }

  const singleToken = queryTokens[0] ?? query;
  const queryMaxDistance = maxDistanceForLength(singleToken.length);
  const comparableCandidate =
    candidate.length <= singleToken.length + queryMaxDistance ? candidate : '';

  return (
    tokenMatch(singleToken) ||
    (comparableCandidate &&
      levenshtein(singleToken, comparableCandidate, queryMaxDistance) <=
        queryMaxDistance)
  );
};

interface Recipe {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  description: string | null;
  view_count: number;
  favorite_count: number;
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
      const titleValue = recipe.title.toLowerCase();
      const titleMatch = fuzzyMatch(searchLower, titleValue);

      const tagMatch = recipe.tags.some((tag) =>
        fuzzyMatch(searchLower, tag.toLowerCase())
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
            <span className="text-sm font-medium opacity-70 text-base-content">Sort by:</span>
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
            <span className="text-sm font-medium opacity-70 text-base-content">Order:</span>
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
        <span className="text-sm opacity-60 font-mono text-base-content">RECIPES</span>
        <div className="h-px bg-gradient-to-r from-transparent via-base-300 to-transparent flex-1"></div>
      </div>

      {/* Recipe cards grid with pagination */}
      <RecipeListClient recipes={sortedAndFilteredRecipes} />
    </>
  );
}

