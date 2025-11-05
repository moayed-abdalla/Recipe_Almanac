/**
 * SEARCHBAR COMPONENT
 * 
 * A comprehensive search interface using DaisyUI components for:
 * - Text search input (debounced for 500ms)
 * - Tag filter dropdown
 * - Sort options (views, date, name)
 * - Sort order toggle (ascending/descending)
 * - Clear filters button
 * - Active filters display with remove badges
 * 
 * Props:
 * - onSearch: function(searchParams) - Called when search/filter/sort changes
 * - availableTags: string[] - List of all available tags for dropdown
 * - initialValues?: object - Initial search state
 */

import { useState, useEffect, useRef } from 'react';

const SearchBar = ({ onSearch, availableTags = [], initialValues = {} }) => {
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
  /**
   * Search text input value
   * Debounced before triggering search
   */
  const [searchText, setSearchText] = useState(initialValues.search || '');
  
  /**
   * Selected tag for filtering
   * Empty string means "All Tags"
   */
  const [selectedTag, setSelectedTag] = useState(initialValues.tag || '');
  
  /**
   * Sort field: 'views', 'created', or 'name'
   */
  const [sortBy, setSortBy] = useState(initialValues.sort || 'views');
  
  /**
   * Sort order: 'asc' or 'desc'
   */
  const [sortOrder, setSortOrder] = useState(initialValues.order || 'desc');
  
  /**
   * Debounce timer reference
   * Stores the timeout ID so we can clear it if user keeps typing
   */
  const debounceTimer = useRef(null);
  
  // ========================================
  // EFFECTS
  // ========================================
  
  /**
   * Debounced Search Effect
   * 
   * Waits 500ms after user stops typing before triggering search.
   * This prevents excessive API calls while user is still typing.
   * 
   * How debouncing works:
   * 1. User types → clear existing timer
   * 2. Start new 500ms timer
   * 3. If user types again before timer ends, repeat step 1-2
   * 4. If timer completes, trigger search
   * 
   * Cleanup function clears timer if component unmounts
   */
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Set new timer
    debounceTimer.current = setTimeout(() => {
      // Trigger search after 500ms of no typing
      handleSearch();
    }, 500);
    
    // Cleanup function - runs when effect re-runs or component unmounts
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchText]); // Only re-run when searchText changes
  
  /**
   * Immediate Search Effect
   * 
   * For tag, sort, and order changes, search immediately (no debounce).
   * These are dropdown selections, not typed input, so debouncing isn't needed.
   */
  useEffect(() => {
    handleSearch();
  }, [selectedTag, sortBy, sortOrder]);
  
  // ========================================
  // HANDLERS
  // ========================================
  
  /**
   * Search Handler
   * 
   * Builds search parameters object and calls parent's onSearch callback.
   * Only includes non-empty values to keep URL params clean.
   */
  const handleSearch = () => {
    const searchParams = {
      ...(searchText && { search: searchText }),
      ...(selectedTag && { tag: selectedTag }),
      sort: sortBy,
      order: sortOrder
    };
    
    onSearch(searchParams);
  };
  
  /**
   * Clear Filters Handler
   * 
   * Resets all filters to default state.
   * Triggers immediate search with empty filters.
   */
  const handleClearFilters = () => {
    setSearchText('');
    setSelectedTag('');
    setSortBy('views');
    setSortOrder('desc');
    
    // Search with default params
    onSearch({ sort: 'views', order: 'desc' });
  };
  
  /**
   * Text Input Change Handler
   * 
   * Updates searchText state.
   * Debounced search will trigger 500ms after user stops typing.
   */
  const handleTextChange = (e) => {
    setSearchText(e.target.value);
  };
  
  /**
   * Tag Select Change Handler
   * 
   * Updates selectedTag state.
   * Triggers immediate search (via useEffect).
   */
  const handleTagChange = (e) => {
    setSelectedTag(e.target.value);
  };
  
  /**
   * Sort Change Handler
   * 
   * Updates sortBy state.
   * Triggers immediate search (via useEffect).
   */
  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };
  
  /**
   * Sort Order Toggle Handler
   * 
   * Toggles between ascending and descending order.
   * Triggers immediate search (via useEffect).
   */
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };
  
  /**
   * Check if any filters are active
   * Used to show/hide clear button and active filters display
   */
  const hasActiveFilters = searchText || selectedTag || sortBy !== 'views' || sortOrder !== 'desc';
  
  // ========================================
  // RENDER
  // ========================================
  
  return (
    <div className="card bg-base-200 shadow-lg mb-6">
      <div className="card-body">
        <h2 className="card-title mb-4">Search & Filter Recipes</h2>
        
        {/* Main Search Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Text Search Input */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Search Recipes</span>
              <span className="label-text-alt text-xs opacity-70">
                Updates as you type
              </span>
            </label>
            <div className="input-group">
              <span className="bg-base-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search by name or description..."
                className="input input-bordered w-full"
                value={searchText}
                onChange={handleTextChange}
              />
              {searchText && (
                <button
                  className="btn btn-square btn-ghost"
                  onClick={() => setSearchText('')}
                  aria-label="Clear search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {/* Tag Filter Dropdown */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Filter by Tag</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={selectedTag}
              onChange={handleTagChange}
            >
              <option value="">All Tags</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Sort Options Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sort By Dropdown */}
          <div className="form-control md:col-span-2">
            <label className="label">
              <span className="label-text font-semibold">Sort By</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={sortBy}
              onChange={handleSortChange}
            >
              <option value="views">Most Viewed</option>
              <option value="created">Recently Added</option>
              <option value="name">Recipe Name (A-Z)</option>
            </select>
          </div>
          
          {/* Sort Order & Clear Buttons */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Actions</span>
            </label>
            <div className="join w-full">
              {/* Sort Order Toggle */}
              <button
                className="btn btn-outline join-item flex-1"
                onClick={toggleSortOrder}
                aria-label={`Sort order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
              >
                {sortOrder === 'asc' ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Asc
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Desc
                  </>
                )}
              </button>
              
              {/* Clear Filters Button */}
              <button
                className="btn btn-ghost join-item flex-1"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            </div>
          </div>
        </div>
        
        {/* Active Filters Display */}
        {(searchText || selectedTag) && (
          <div className="divider my-2"></div>
        )}
        
        {(searchText || selectedTag) && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-semibold opacity-70">Active filters:</span>
            {searchText && (
              <div className="badge badge-primary gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                "{searchText}"
                <button
                  onClick={() => setSearchText('')}
                  className="btn btn-xs btn-ghost btn-circle"
                  aria-label="Remove search filter"
                >
                  ✕
                </button>
              </div>
            )}
            {selectedTag && (
              <div className="badge badge-secondary gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {selectedTag}
                <button
                  onClick={() => setSelectedTag('')}
                  className="btn btn-xs btn-ghost btn-circle"
                  aria-label="Remove tag filter"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
