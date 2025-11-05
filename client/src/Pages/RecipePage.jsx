/**
 * RECIPE PAGE
 * 
 * Displays full recipe details including:
 * - Recipe image
 * - Title and owner
 * - Tags
 * - Ingredients with checkboxes
 * - Unit converter
 * - Method steps
 * - Notes
 * - Edit/Delete buttons (owner only)
 * - Save/Unsave button
 * 
 * URL: /:username/:recipeName
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import UnitConverter from '../components/UnitConverter';
import api from '../services/api';

const RecipePage = () => {
  const { username, recipeName } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState({});
  
  // Get current user
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const isOwner = currentUser?.username === username;
  
  /**
   * Fetch recipe data on mount
   */
  useEffect(() => {
    fetchRecipe();
    if (currentUser) {
      checkIfSaved();
    }
  }, [username, recipeName]);
  
  /**
   * Fetch recipe details from API
   */
  const fetchRecipe = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.recipes.getOne(username, recipeName);
      setRecipe(response.data.recipe);
      
      // Initialize checked state for all ingredients
      const initialChecked = {};
      response.data.recipe.ingredients.forEach((_, index) => {
        initialChecked[index] = false;
      });
      setCheckedIngredients(initialChecked);
    } catch (err) {
      console.error('Error fetching recipe:', err);
      setError('Failed to load recipe. It may not exist or be private.');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Check if recipe is saved in user's almanac
   */
  const checkIfSaved = async () => {
    try {
      const response = await api.almanac.checkSaved(
        currentUser.username,
        username,
        recipeName
      );
      setIsSaved(response.data.isSaved);
    } catch (err) {
      console.error('Error checking saved status:', err);
    }
  };
  
  /**
   * Toggle ingredient checkbox
   */
  const toggleIngredient = (index) => {
    setCheckedIngredients(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };
  
  /**
   * Handle unit conversion
   * Updates recipe ingredients with converted values
   */
  const handleConversion = (convertedIngredients) => {
    setRecipe(prev => ({
      ...prev,
      ingredients: convertedIngredients
    }));
  };
  
  /**
   * Handle save/unsave recipe
   */
  const handleSaveToggle = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    try {
      if (isSaved) {
        await api.almanac.unsaveRecipe({
          recipeOwner: username,
          recipeName: recipeName
        });
        setIsSaved(false);
      } else {
        await api.almanac.saveRecipe({
          recipeOwner: username,
          recipeName: recipeName
        });
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Error toggling save:', err);
      alert('Failed to save/unsave recipe');
    }
  };
  
  /**
   * Handle delete recipe
   */
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this recipe?')) {
      return;
    }
    
    try {
      await api.recipes.delete(username, recipeName);
      navigate('/almanac');
    } catch (err) {
      console.error('Error deleting recipe:', err);
      alert('Failed to delete recipe');
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
        <Link to="/" className="btn btn-primary mt-4">
          Back to Home
        </Link>
      </div>
    );
  }
  
  // No recipe found
  if (!recipe) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Recipe not found</h1>
          <Link to="/" className="btn btn-primary">Back to Home</Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Recipe Header */}
      <div className="mb-6">
        {/* Recipe Image */}
        {recipe.picture && (
          <figure className="mb-6 rounded-lg overflow-hidden">
            <img
              src={recipe.picture}
              alt={recipe.name}
              className="w-full h-96 object-cover"
            />
          </figure>
        )}
        
        {/* Title and Actions */}
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="flex-grow">
            <h1 className="text-4xl font-bold mb-2">{recipe.name}</h1>
            <Link
              to={`/users/${recipe.owner}`}
              className="text-lg opacity-70 hover:opacity-100 hover:underline"
            >
              by {recipe.owner}
            </Link>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            {isOwner ? (
              <>
                <Link
                  to={`/${username}/${recipeName}/edit`}
                  className="btn btn-primary"
                >
                  Edit
                </Link>
                <button
                  onClick={handleDelete}
                  className="btn btn-error"
                >
                  Delete
                </button>
              </>
            ) : currentUser ? (
              <button
                onClick={handleSaveToggle}
                className={`btn ${isSaved ? 'btn-primary' : 'btn-outline'}`}
              >
                {isSaved ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                    </svg>
                    Saved
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Save
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
        
        {/* Description */}
        {recipe.description && (
          <p className="text-lg mb-4">{recipe.description}</p>
        )}
        
        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {recipe.tags.map((tag, index) => (
              <span key={index} className="badge badge-lg badge-outline">
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {/* View Count */}
        <div className="flex items-center gap-2 text-sm opacity-70">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>{recipe.viewCount} views</span>
        </div>
      </div>
      
      <div className="divider"></div>
      
      {/* Ingredients Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Ingredients</h2>
        
        {/* Unit Converter */}
        <UnitConverter
          ingredients={recipe.ingredients}
          onConvert={handleConversion}
        />
        
        {/* Ingredients List with Checkboxes */}
        <div className="bg-base-200 rounded-lg p-6">
          {recipe.ingredients.map((ingredient, index) => (
            <div key={index} className="form-control">
              <label className="label cursor-pointer justify-start gap-4">
                <input
                  type="checkbox"
                  checked={checkedIngredients[index] || false}
                  onChange={() => toggleIngredient(index)}
                  className="checkbox"
                />
                <span className={`label-text text-lg ${checkedIngredients[index] ? 'line-through opacity-50' : ''}`}>
                  {ingredient.amount} {ingredient.unit} {ingredient.description}
                </span>
              </label>
            </div>
          ))}
        </div>
      </div>
      
      {/* Method Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Method</h2>
        <div className="bg-base-200 rounded-lg p-6">
          <ol className="list-decimal list-inside space-y-3">
            {recipe.method.map((step, index) => (
              <li key={index} className="text-lg">
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
      
      {/* Notes Section */}
      {recipe.notes && recipe.notes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Notes</h2>
          <div className="bg-base-200 rounded-lg p-6">
            <ul className="list-disc list-inside space-y-2">
              {recipe.notes.map((note, index) => (
                <li key={index} className="text-lg">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipePage;
