/**
 * HOME PAGE
 * 
 * Main landing page showing all public recipes.
 * 
 * Features:
 * - SearchBar for filtering recipes by text, tags, and sorting
 * - Grid of RecipeCards with save/unsave functionality
 * - Pagination for large recipe lists
 * - Loading states and error handling
 * - Empty state message when no recipes found
 */

import { useState, useEffect } from 'react';
import SearchBar from '../components/SearchBar';
import RecipeCard from '../components/RecipeCard';
import api from '../services/api';

const Home = () => {
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
  /**
   * Recipe data from API
   */
  const [recipes, setRecipes] = useState([]);
  
  /**
   * Loading state for initial fetch and pagination
   */
  const [loading, setLoading] = useState(true);
  
  /**
   * Error state for API failures
   */
  const [error, setError] = useState(null);
  
  /**
   * Search parameters for filtering and sorting
   * { search: string, tag: string, sort: string, order: string }
   */
  const [searchParams, setSearchParams] = useState({ 
    sort: 'views', 
    order: 'desc' 
  });
  
  /**
   * Pagination information
   * { page: number, limit: number, total: number, totalPages: number }
   */
  const [pagination, setPagination] = useState({ 
    page: 1, 
    limit: 20, 
    total: 0, 
    totalPages: 0 
  });
  
  /**
   * Available tags for filter dropdown
   * Extracted from all recipes
   */
  const [availableTags, setAvailableTags] = useState([]);
  
  /**
   * Current user from localStorage
   * Used to show save/unsave button and check saved status
   */
  const currentUser = JSON.parse(localStorage.getItem('user'));
  
  // ========================================
  // EFFECTS
  // ========================================
  
  /**
   * Initial load - fetch recipes and tags
   */
  useEffect(() => {
    fetchRecipes();
    fetchTags();
  }, []);
  
  // ========================================
  // API FUNCTIONS
  // ========================================
  
  /**
   * Fetch recipes based on search parameters and page
   * 
   * @param {object} params - Search parameters (search, tag, sort, order)
   * @param {number} page - Page number to fetch
   */
  const fetchRecipes = async (params = searchParams, page = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.recipes.getAll({
        ...params,
        page,
        limit: pagination.limit
      });
      
      setRecipes(response.data.recipes);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Error fetching recipes:', err);
      setError('Failed to load recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Fetch all unique tags for filter dropdown
   * Gets all recipes (with high limit) and extracts unique tags
   */
  const fetchTags = async () => {
    try {
      const response = await api.recipes.getAll({ limit: 1000 });
      
      // Extract all unique tags from recipes
      const allTags = new Set();
      response.data.recipes.forEach(recipe => {
        recipe.tags?.forEach(tag => allTags.add(tag));
      });
      
      setAvailableTags(Array.from(allTags).sort());
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  };
  
  // ========================================
  // HANDLERS
  // ========================================
  
  /**
   * Handle search parameter changes from SearchBar
   * Resets to page 1 when search changes
   * 
   * @param {object} params - New search parameters
   */
  const handleSearch = (params) => {
    setSearchParams(params);
    fetchRecipes(params, 1);
  };
  
  /**
   * Handle pagination - change page
   * Scrolls to top when page changes
   * 
   * @param {number} newPage - Page number to navigate to
   */
  const handlePageChange = (newPage) => {
    fetchRecipes(searchParams, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  /**
   * Handle save recipe to almanac
   * Updates UI optimistically
   * 
   * @param {string} owner - Recipe owner username
   * @param {string} name - Recipe name
   */
  const handleSaveRecipe = async (owner, name) => {
    try {
      await api.almanac.saveRecipe({ 
        recipeOwner: owner, 
        recipeName: name 
      });
      
      // Update recipe's saved state in UI
      setRecipes(recipes.map(r =>
        r.owner === owner && r.name === name
          ? { ...r, isSaved: true }
          : r
      ));
    } catch (err) {
      console.error('Error saving recipe:', err);
      alert('Failed to save recipe. Please try again.');
    }
  };
  
  /**
   * Handle unsave recipe from almanac
   * Updates UI optimistically
   * 
   * @param {string} owner - Recipe owner username
   * @param {string} name - Recipe name
   */
  const handleUnsaveRecipe = async (owner, name) => {
    try {
      await api.almanac.unsaveRecipe({ 
        recipeOwner: owner, 
        recipeName: name 
      });
      
      // Update recipe's saved state in UI
      setRecipes(recipes.map(r =>
        r.owner === owner && r.name === name
          ? { ...r, isSaved: false }
          : r
      ));
    } catch (err) {
      console.error('Error unsaving recipe:', err);
      alert('Failed to unsave recipe. Please try again.');
    }
  };
  
  // ========================================
  // RENDER
  // ========================================
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Recipe Almanac</h1>
        <p className="text-lg opacity-70">
          Your ad-free digital recipe book. Share, browse, and write your own recipes.
        </p>
      </div>
      
      {/* Search Bar */}
      <SearchBar
        onSearch={handleSearch}
        availableTags={availableTags}
        initialValues={searchParams}
      />
      
      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center min-h-[400px]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="alert alert-error mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      
      {/* Recipes Grid */}
      {!loading && !error && (
        <>
          {recipes.length > 0 ? (
            <>
              {/* Recipe Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {recipes.map((recipe, index) => (
                  <RecipeCard
                    key={`${recipe.owner}-${recipe.name}-${index}`}
                    recipe={recipe}
                    currentUser={currentUser}
                    onSave={handleSaveRecipe}
                    onUnsave={handleUnsaveRecipe}
                  />
                ))}
              </div>
              
              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 flex-wrap">
                  {/* Previous Button */}
                  <button
                    className="btn btn-outline"
                    disabled={pagination.page === 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  
                  {/* Page Info */}
                  <div className="btn btn-ghost">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  
                  {/* Next Button */}
                  <button
                    className="btn btn-outline"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => handlePageChange(pagination.page + 1)}
                  >
                    Next
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
              
              {/* Results Summary */}
              <div className="text-center mt-4 opacity-70 text-sm">
                Showing {recipes.length} of {pagination.total} recipes
              </div>
            </>
          ) : (
            /* Empty State - No Recipes Found */
            <div className="text-center py-16">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-2xl font-semibold mb-2">No recipes found</h2>
              <p className="opacity-70 mb-4">
                Try adjusting your search filters or create the first recipe!
              </p>
              {currentUser && (
                <a href="/recipe/new" className="btn btn-primary">
                  Create Your First Recipe
                </a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Home;
