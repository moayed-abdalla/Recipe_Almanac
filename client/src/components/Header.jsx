/**
 * HEADER COMPONENT
 * 
 * Global navigation header displayed on all pages.
 * 
 * Features:
 * - Logo/Home link
 * - Theme toggle (light/dark mode with icon)
 * - Profile picture with dropdown menu
 * - Login/Almanac button based on auth state
 * - GitHub and Buy Me a Coffee links
 * 
 * Props:
 * - theme: string - Current theme ('recipeLight' or 'recipeDark')
 * - toggleTheme: function - Toggle theme handler
 * - isAuthenticated: boolean - Whether user is logged in
 * - currentUser: object - Current user data { username, profilePicture }
 * - onLogout: function - Logout handler
 */

import { Link } from 'react-router';
import { useState, useRef, useEffect } from 'react';

const Header = ({ theme, toggleTheme, isAuthenticated, currentUser, onLogout }) => {
  // State for dropdown menu
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  /**
   * Close dropdown when clicking outside
   * Uses ref to detect clicks outside dropdown element
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  /**
   * Handle logout
   * Closes dropdown and calls parent's onLogout handler
   */
  const handleLogout = () => {
    setIsDropdownOpen(false);
    onLogout();
  };
  
  return (
    <header className="navbar bg-base-100 shadow-lg px-4 sticky top-0 z-50">
      <div className="navbar-start">
        {/* Logo - Links to Home */}
        <Link to="/" className="btn btn-ghost normal-case text-xl gap-2">
          <img src="/logo.png" alt="Recipe Almanac" className="h-8 w-8" />
          <span className="hidden sm:inline">Recipe Almanac</span>
        </Link>
      </div>
      
      <div className="navbar-center hidden lg:flex">
        {/* Optional: Add navigation links here */}
      </div>
      
      <div className="navbar-end gap-2">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="btn btn-ghost btn-circle"
          aria-label="Toggle theme"
        >
          {theme === 'recipeLight' ? (
            // Moon icon for light mode (clicking switches to dark)
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            // Sun icon for dark mode (clicking switches to light)
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>
        
        {/* GitHub Link */}
        <a
          href="https://github.com/moayed-abdalla/Recipe_Almanac/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-circle"
          aria-label="GitHub Repository"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </a>
        
        {/* Buy Me a Coffee Link */}
        <a
          href="https://buymeacoffee.com/moayed_abdalla"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-circle"
          aria-label="Buy Me a Coffee"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </a>
        
        {isAuthenticated ? (
          <>
            {/* Almanac Link */}
            <Link to="/almanac" className="btn btn-ghost">
              My Almanac
            </Link>
            
            {/* Profile Dropdown */}
            <div className="dropdown dropdown-end" ref={dropdownRef}>
              <button
                tabIndex={0}
                className="btn btn-ghost btn-circle avatar"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                aria-label="Profile menu"
              >
                <div className="w-10 rounded-full">
                  <img
                    src={currentUser?.profilePicture || 'https://img.daisyui.com/images/profile/demo/batperson@192.webp'}
                    alt={currentUser?.username || 'User'}
                  />
                </div>
              </button>
              {isDropdownOpen && (
                <ul
                  tabIndex={0}
                  className="menu menu-sm dropdown-content mt-3 z- p-2 shadow bg-base-100 rounded-box w-52"
                >
                  <li className="menu-title">
                    <span>{currentUser?.username}</span>
                  </li>
                  <li>
                    <Link to="/profile" onClick={() => setIsDropdownOpen(false)}>
                      Profile
                    </Link>
                  </li>
                  <li>
                    <Link to="/almanac" onClick={() => setIsDropdownOpen(false)}>
                      My Almanac
                    </Link>
                  </li>
                  <li>
                    <Link to="/recipe/new" onClick={() => setIsDropdownOpen(false)}>
                      Create Recipe
                    </Link>
                  </li>
                  <li>
                    <button onClick={handleLogout}>Logout</button>
                  </li>
                </ul>
              )}
            </div>
          </>
        ) : (
          /* Login Button for non-authenticated users */
          <Link to="/login" className="btn btn-primary">
            Login
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header;
