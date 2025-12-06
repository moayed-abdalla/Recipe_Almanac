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

interface SearchBarProps {
  onSearchChange?: (searchTerm: string) => void;
}

export default function SearchBar({ onSearchChange }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  /**
   * Handle search input changes and update parent component
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Call parent callback to filter recipes in real-time
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  /**
   * Handle search form submission (prevent default to avoid page reload)
   */
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Search is handled in real-time via onChange, so we just prevent default
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
            onChange={handleInputChange}
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

