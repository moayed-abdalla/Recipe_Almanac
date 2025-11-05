/**
 * RECIPECARD COMPONENT
 * 
 * Displays a recipe in card format with:
 * - Recipe image
 * - Recipe name
 * - Owner name (clickable)
 * - Tags (first 3)
 * - View count
 * - Save/Unsave button
 * 
 * Props:
 * - recipe: object - Recipe data
 *   {
 *     owner: string,
 *     name: string,
 *     picture: string,
 *     description: string,
 *     tags: string[],
 *     viewCount: number,
 *     isSaved?: boolean
 *   }
 * - currentUser: object - Current logged-in user
 * - onSave: function - Save recipe handler
 * - onUnsave: function - Unsave recipe handler
 */

import { Link } from 'react-router';
import { useState } from 'react';

const RecipeCard = ({ recipe, currentUser, onSave, onUnsave }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(recipe.isSaved || false);
  
  /**
   * Handle save/unsave toggle
   * Optimistically updates UI before API call completes
   */
  const handleSaveToggle = async (e) => {
    e.preventDefault(); // Prevent card click
    e.stopPropagation(); // Stop event bubbling
    
    if (!currentUser) {
      // Redirect to login if not authenticated
      window.location.href = '/login';
      return;
    }
    
    setIsSaving(true);
    
    try {
      if (saved) {
        await onUnsave(recipe.owner, recipe.name);
        setSaved(false);
      } else {
        await onSave(recipe.owner, recipe.name);
        setSaved(true);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      // Revert optimistic update on error
      setSaved(!saved);
    } finally {
      setIsSaving(false);
    }
  };
  
  /**
   * Format view count for display
   * Shows "1k" instead of "1000", etc.
   */
  const formatViews = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };
  
  return (
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
      {/* Recipe Image */}
      <figure className="relative h-48 overflow-hidden">
        <Link to={`/${recipe.owner}/${recipe.name}`}>
          <img
            src={recipe.picture || '/placeholder-recipe.jpg'}
            alt={recipe.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </Link>
        
        {/* Save Button Overlay */}
        {currentUser && currentUser.username !== recipe.owner && (
          <button
            onClick={handleSaveToggle}
            disabled={isSaving}
            className={`btn btn-circle btn-sm absolute top-2 right-2 ${
              saved ? 'btn-primary' : 'btn-ghost bg-base-100 bg-opacity-70'
            }`}
            aria-label={saved ? 'Unsave recipe' : 'Save recipe'}
          >
            {saved ? (
              // Filled bookmark
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
            ) : (
              // Outline bookmark
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            )}
          </button>
        )}
      </figure>
      
      {/* Recipe Details */}
      <div className="card-body p-4">
        {/* Recipe Name */}
        <Link to={`/${recipe.owner}/${recipe.name}`}>
          <h2 className="card-title text-lg hover:text-primary transition-colors">
            {recipe.name}
          </h2>
        </Link>
        
        {/* Owner Name */}
        <Link 
          to={`/users/${recipe.owner}`}
          className="text-sm opacity-70 hover:opacity-100 hover:underline"
        >
          by {recipe.owner}
        </Link>
        
        {/* Description (truncated) */}
        {recipe.description && (
          <p className="text-sm line-clamp-2 opacity-80">
            {recipe.description}
          </p>
        )}
        
        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {recipe.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="badge badge-sm badge-outline"
              >
                {tag}
              </span>
            ))}
            {recipe.tags.length > 3 && (
              <span className="badge badge-sm badge-ghost">
                +{recipe.tags.length - 3}
              </span>
            )}
          </div>
        )}
        
        {/* View Count */}
        <div className="flex items-center gap-2 mt-2 text-sm opacity-70">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>{formatViews(recipe.viewCount)} views</span>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
