/**
 * RECIPE CREATE PAGE
 * 
 * Form to create a new recipe.
 * Includes validation and handles image uploads.
 * 
 * Requires authentication.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';
import api from '../services/api';

const RecipeCreate = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user'));
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    picture: '',
    description: '',
    tags: '',
    isPublic: true
  });
  
  // Dynamic lists
  const [ingredients, setIngredients] = useState([
    { amount: '', unit: 'cup', description: '' }
  ]);
  
  const [method, setMethod] = useState(['']);
  const [notes, setNotes] = useState(['']);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  /**
   * Handle form field changes
   */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  /**
   * Handle ingredient changes
   */
  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...ingredients];
    newIngredients[index][field] = value;
    setIngredients(newIngredients);
  };
  
  /**
   * Add new ingredient field
   */
  const addIngredient = () => {
    setIngredients([...ingredients, { amount: '', unit: 'cup', description: '' }]);
  };
  
  /**
   * Remove ingredient field
   */
  const removeIngredient = (index) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };
  
  /**
   * Handle method step changes
   */
  const handleMethodChange = (index, value) => {
    const newMethod = [...method];
    newMethod[index] = value;
    setMethod(newMethod);
  };
  
  /**
   * Add new method step
   */
  const addMethodStep = () => {
    setMethod([...method, '']);
  };
  
  /**
   * Remove method step
   */
  const removeMethodStep = (index) => {
    if (method.length > 1) {
      setMethod(method.filter((_, i) => i !== index));
    }
  };
  
  /**
   * Handle notes changes
   */
  const handleNoteChange = (index, value) => {
    const newNotes = [...notes];
    newNotes[index] = value;
    setNotes(newNotes);
  };
  
  /**
   * Add new note
   */
  const addNote = () => {
    setNotes([...notes, '']);
  };
  
  /**
   * Remove note
   */
  const removeNote = (index) => {
    setNotes(notes.filter((_, i) => i !== index));
  };
  
  /**
   * Validate form data
   */
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Recipe name is required');
      return false;
    }
    
    // Check at least one ingredient
    const validIngredients = ingredients.filter(ing =>
      ing.amount && ing.unit && ing.description.trim()
    );
    if (validIngredients.length === 0) {
      setError('At least one complete ingredient is required');
      return false;
    }
    
    // Check at least one method step
    const validMethod = method.filter(step => step.trim());
    if (validMethod.length === 0) {
      setError('At least one method step is required');
      return false;
    }
    
    return true;
  };
  
  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Filter out empty ingredients
      const validIngredients = ingredients.filter(ing =>
        ing.amount && ing.unit && ing.description.trim()
      ).map(ing => ({
        ...ing,
        amount: parseFloat(ing.amount)
      }));
      
      // Filter out empty method steps
      const validMethod = method.filter(step => step.trim());
      
      // Filter out empty notes
      const validNotes = notes.filter(note => note.trim());
      
      // Parse tags (comma-separated)
      const tagArray = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];
      
      const recipeData = {
        name: formData.name.trim(),
        picture: formData.picture.trim() || null,
        description: formData.description.trim() || null,
        tags: tagArray,
        ingredients: validIngredients,
        method: validMethod,
        notes: validNotes,
        isPublic: formData.isPublic
      };
      
      await api.recipes.create(recipeData);
      
      // Navigate to the new recipe page
      navigate(`/${currentUser.username}/${formData.name}`);
    } catch (err) {
      console.error('Error creating recipe:', err);
      setError(err.response?.data?.message || 'Failed to create recipe');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Create New Recipe</h1>
      
      {error && (
        <div className="alert alert-error mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Basic Information</h2>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">Recipe Name *</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input input-bordered"
                required
              />
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">Picture URL</span>
              </label>
              <input
                type="url"
                name="picture"
                value={formData.picture}
                onChange={handleChange}
                className="input input-bordered"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">Description</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="textarea textarea-bordered h-24"
                placeholder="Brief description of your recipe..."
              />
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">Tags (comma-separated)</span>
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="input input-bordered"
                placeholder="dessert, chocolate, easy"
              />
            </div>
            
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Make recipe public</span>
                <input
                  type="checkbox"
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={handleChange}
                  className="checkbox"
                />
              </label>
            </div>
          </div>
        </div>
        
        {/* Ingredients */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Ingredients *</h2>
            
            {ingredients.map((ingredient, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="form-control flex-grow">
                  {index === 0 && (
                    <label className="label">
                      <span className="label-text">Amount</span>
                    </label>
                  )}
                  <input
                    type="number"
                    step="0.01"
                    value={ingredient.amount}
                    onChange={(e) => handleIngredientChange(index, 'amount', e.target.value)}
                    className="input input-bordered"
                    placeholder="2"
                  />
                </div>
                
                <div className="form-control">
                  {index === 0 && (
                    <label className="label">
                      <span className="label-text">Unit</span>
                    </label>
                  )}
                  <select
                    value={ingredient.unit}
                    onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                    className="select select-bordered"
                  >
                    <option value="cup">cup</option>
                    <option value="cups">cups</option>
                    <option value="tsp">tsp</option>
                    <option value="tbsp">tbsp</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="l">l</option>
                    <option value="oz">oz</option>
                    <option value="lb">lb</option>
                  </select>
                </div>
                
                <div className="form-control flex-grow-">
                  {index === 0 && (
                    <label className="label">
                      <span className="label-text">Ingredient</span>
                    </label>
                  )}
                  <input
                    type="text"
                    value={ingredient.description}
                    onChange={(e) => handleIngredientChange(index, 'description', e.target.value)}
                    className="input input-bordered"
                    placeholder="flour"
                  />
                </div>
                
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className="btn btn-error btn-square"
                  disabled={ingredients.length === 1}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addIngredient}
              className="btn btn-outline btn-sm"
            >
              + Add Ingredient
            </button>
          </div>
        </div>
        
        {/* Method */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Method *</h2>
            
            {method.map((step, index) => (
              <div key={index} className="flex gap-2 items-start">
                <span className="text-lg font-semibold pt-3">{index + 1}.</span>
                <textarea
                  value={step}
                  onChange={(e) => handleMethodChange(index, e.target.value)}
                  className="textarea textarea-bordered flex-grow"
                  placeholder="Describe this step..."
                  rows="2"
                />
                <button
                  type="button"
                  onClick={() => removeMethodStep(index)}
                  className="btn btn-error btn-square"
                  disabled={method.length === 1}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addMethodStep}
              className="btn btn-outline btn-sm"
            >
              + Add Step
            </button>
          </div>
        </div>
        
        {/* Notes */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Notes (Optional)</h2>
            
            {notes.map((note, index) => (
              <div key={index} className="flex gap-2 items-start">
                <textarea
                  value={note}
                  onChange={(e) => handleNoteChange(index, e.target.value)}
                  className="textarea textarea-bordered flex-grow"
                  placeholder="Additional note or tip..."
                  rows="2"
                />
                <button
                  type="button"
                  onClick={() => removeNote(index)}
                  className="btn btn-error btn-square"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addNote}
              className="btn btn-outline btn-sm"
            >
              + Add Note
            </button>
          </div>
        </div>
        
        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            className="btn btn-primary flex-grow"
            disabled={loading}
          >
            {loading ? (
              <span className="loading loading-spinner"></span>
            ) : (
              'Create Recipe'
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-ghost"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default RecipeCreate;
