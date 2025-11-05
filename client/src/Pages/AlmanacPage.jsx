/**
 * ALMANAC PAGE
 * 
 * Displays user's personal recipe collection.
 * Shows both owned recipes and saved recipes from others.
 * 
 * Features:
 * - Filter by "My Recipes" or "Saved Recipes" or "All"
 * - Filter by tags
 * - Recipe cards with unsave button
 * - Statistics display (total, owned, saved counts)
 * - Create recipe button
 * - Empty state with helpful message
 * 
 * Requires authentication - redirects to login if not logged in.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import RecipeCard from '../components/RecipeCard';
import api from '../services/api';

const AlmanacPage = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user'));
  
  // Redirect if not authenticated
  if (!currentUser) {
    navigate('/login');
    return null;
  }
  
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
  /**
   * Recipe data from API
   */
  const [recipes, setRecipes] = useState([]);
  
  /**
   * Statistics about user's almanac
   * { total: number, owned: number, saved: number }
   */
  const [stats, setStats] = useState({ 
    total: 0, 
    owned: 0, 
    saved: 0 
  });
  
  /**
   * Loading state
   */
  const [loading, setLoading] = useState(true);
  
  /**
   * Error state
   */
  const [error, setError] = useState(null);
  
  /**
   * Recipe filter: 'all', 'owned', or 'saved'
   */
  const [recipeFilter, setRecipeFilter] = useState('all');
  
  /**
   * Tag filter for filtering by specific tag
   */
  const [tagFilter, setTagFilter] = useState('');
  
  /**
   * Available tags extracted from user's recipes
   */
  const [availableTags, setAvailableTags] = useState([]);
  
  // ========================================
  // EFFECTS
  // ========================================
  
  /**
   * Fetch almanac data when filters change
   */
  useEffect(() => {
    fetchAlmanac();
  }, [recipeFilter, tagFilter]);
  
  // ========================================
  // API FUNCTIONS
  // ========================================
  
  /**
   * Fetch almanac recipes and statistics
   * Applies current filters
   */
  const fetchAlmanac = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      const params = {};
      if (recipeFilter !== 'all') {
        params.filter = recipeFilter;
      }
      if (tagFilter) {
        params.tag = tagFilter;
      }
      
      const response = await api.almanac.getSaved(currentUser.username, params);
      setRecipes(response.data.recipes);
      setStats(response.data.stats);
      
      // Extract all unique tags from recipes
      const allTags = new Set();
      response.data.recipes.forEach(recipe => {
        recipe.tags?.forEach(tag => allTags.add(tag));
      });
      setAvailableTags(Array.from(allTags).sort());
    } catch (err) {
      console.error('Error fetching almanac:', err);
      setError('Failed to load your almanac. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // ========================================
  // HANDLERS
  // ========================================
  
  /**
   * Handle unsave recipe
   * Removes recipe from list immediately (optimistic update)
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
      
      // Remove recipe from list
      setRecipes(recipes.filter(r => 
        !(r.owner === owner && r.name === name)
      ));
      
      // Update statistics
      setStats(prev => ({
        ...prev,
        total: prev.total - 1,
        saved: prev.saved - 1
      }));
    } catch (err) {
      console.error('Error unsaving recipe:', err);
      alert('Failed to unsave recipe. Please try again.');
    }
  };
  
  /**
   * Handle save recipe
   * For owned recipes that user wants to mark as saved
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
      
      // Update recipe's saved state
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
   * Handle clear all filters
   */
  const handleClearFilters = () => {
    setRecipeFilter('all');
    setTagFilter('');
  };
  
  // ========================================
  // RENDER
  // ========================================
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Almanac</h1>
          <p className="opacity-70">Your personal recipe collection</p>
        </div>
        <Link to="/recipe/new" className="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Recipe
        </Link>
      </div>
      
      {/* Statistics Cards */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full mb-8">
        <div className="stat">
          <div className="stat-figure text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="stat-title">Total Recipes</div>
          <div className="stat-value text-primary">{stats.total}</div>
          <div className="stat-desc">In your almanac</div>
        </div>
        
        <div className="stat">
          <div className="stat-figure text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div className="stat-title">My Recipes</div>
          <div className="stat-value text-secondary">{stats.owned}</div>
          <div className="stat-desc">Created by you</div>
        </div>
        
        <div className="stat">
          <div className="stat-figure text-accent">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <div className="stat-title">Saved Recipes</div>
          <div className="stat-value text-accent">{stats.saved}</div>
          <div className="stat-desc">From other cooks</div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="card bg-base-200 shadow-lg mb-6">
        <div className="card-body">
          <h2 className="card-title">Filters</h2>
          
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Recipe Type Filter */}
            <div className="form-control flex-grow">
              <label className="label">
                <span className="label-text">Recipe Type</span>
              </label>
              <select
                className="select select-bordered"
                value={recipeFilter}
                onChange={(e) => setRecipeFilter(e.target.value)}
              >
                <option value="all">All Recipes</option>
                <option value="owned">My Recipes</option>
                <option value="saved">Saved Recipes</option>
              </select>
            </div>
            
            {/* Tag Filter */}
            <div className="form-control flex-grow">
              <label className="label">
                <span className="label-text">Filter by Tag</span>
              </label>
              <select
                className="select select-bordered"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
              >
                <option value="">All Tags</option>
                {availableTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
            
            {/* Clear Filters Button */}
            {(recipeFilter !== 'all' || tagFilter) && (
              <div className="form-control">
                <label className="label opacity-0">Clear</label>
                <button
                  onClick={handleClearFilters}
                  className="btn btn-ghost"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
          ) : (
            /* Empty State - No Recipes Found */
            <div className="text-center py-16">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h2 className="text-2xl font-semibold mb-2">No recipes found</h2>
              <p className="opacity-70 mb-4">
                {recipeFilter === 'all' && !tagFilter && 
                  'Start by creating your first recipe or saving recipes from others'}
                {(recipeFilter !== 'all' || tagFilter) && 
                  'Try adjusting your filters'}
              </p>
              {recipeFilter === 'all' && !tagFilter && (
                <Link to="/recipe/new" className="btn btn-primary">
                  Create Your First Recipe
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AlmanacPage;
