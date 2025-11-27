/**
 * Search Bar Component
 * 
 * Provides a search input for finding recipes by name or tags.
 * Currently displays search term in console - search functionality
 * can be implemented by navigating to a search results page or
 * filtering the homepage recipes.
 * 
 * This is a Client Component because it needs to:
 * - Handle form submission
 * - Manage search input state
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchBar() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  /**
   * Handle search form submission
   * TODO: Implement full search functionality
   * For now, this could navigate to a search results page
   * or filter recipes on the homepage
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      return; // Don't search if input is empty
    }
    
    // TODO: Implement search functionality
    // Option 1: Navigate to search results page
    // router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
    
    // Option 2: Filter recipes on current page
    // This would require passing search term to parent component
    
    console.log('Searching for:', searchTerm);
  };

  return (
    <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto">
      <div className="form-control">
        <div className="input-group flex">
          <input
            type="text"
            placeholder="Search recipes by name or tags..."
            className="input input-bordered flex-1 typewriter"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="btn btn-square">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        </div>
      </div>
    </form>
  );
}

