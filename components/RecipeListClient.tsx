/**
 * Recipe List Client Component with Pagination
 * 
 * Handles pagination for recipe cards with responsive recipe counts:
 * - Large screens: Up to 9 recipes (3 rows × 3 columns)
 * - Medium screens: Up to 6 recipes (3 rows × 2 columns)
 * - Small screens: Up to 3 recipes (3 rows × 1 column)
 * 
 * This is a Client Component because it needs to:
 * - Handle pagination state
 * - Respond to screen size changes
 * - Manage user interactions
 */

'use client';

import { useState, useEffect } from 'react';
import RecipeCard from './RecipeCard';

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

interface RecipeListClientProps {
  recipes: Recipe[];
}

export default function RecipeListClient({ recipes }: RecipeListClientProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [recipesPerPage, setRecipesPerPage] = useState(9); // Default for large screens

  /**
   * Calculate recipes per page based on screen size
   * Large: 3 columns × 3 rows = 9 recipes
   * Medium: 2 columns × 3 rows = 6 recipes
   * Small: 1 column × 3 rows = 3 recipes
   */
  useEffect(() => {
    const updateRecipesPerPage = () => {
      if (window.innerWidth >= 1024) {
        // Large screens: 3 columns
        setRecipesPerPage(9);
      } else if (window.innerWidth >= 768) {
        // Medium screens: 2 columns
        setRecipesPerPage(6);
      } else {
        // Small screens: 1 column
        setRecipesPerPage(3);
      }
    };

    updateRecipesPerPage();
    window.addEventListener('resize', updateRecipesPerPage);
    return () => window.removeEventListener('resize', updateRecipesPerPage);
  }, []);

  // Calculate pagination
  const totalPages = Math.ceil(recipes.length / recipesPerPage);
  const startIndex = (currentPage - 1) * recipesPerPage;
  const endIndex = startIndex + recipesPerPage;
  const currentRecipes = recipes.slice(startIndex, endIndex);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  if (recipes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg opacity-70">No recipes found. Be the first to create one!</p>
      </div>
    );
  }

  return (
    <>
      {/* Recipe cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {currentRecipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            id={recipe.id}
            slug={recipe.slug}
            title={recipe.title}
            imageUrl={recipe.image_url}
            description={recipe.description}
            username={recipe.profiles.username}
            viewCount={recipe.view_count}
            tags={recipe.tags}
          />
        ))}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="btn btn-sm btn-outline"
          >
            Previous
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, current page, and pages around current
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`btn btn-sm ${currentPage === page ? 'btn-primary' : 'btn-outline'}`}
                  >
                    {page}
                  </button>
                );
              } else if (page === currentPage - 2 || page === currentPage + 2) {
                return <span key={page} className="btn btn-sm btn-disabled">...</span>;
              }
              return null;
            })}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="btn btn-sm btn-outline"
          >
            Next
          </button>
        </div>
      )}

      {/* Page info */}
      {totalPages > 1 && (
        <div className="text-center mt-4 text-sm opacity-60">
          Showing {startIndex + 1}-{Math.min(endIndex, recipes.length)} of {recipes.length} recipes
        </div>
      )}
    </>
  );
}

