/**
 * RECIPE EDIT PAGE
 * 
 * Form to edit an existing recipe.
 * Similar to RecipeCreate but pre-populated with existing data.
 * Only the recipe owner can access this page.
 * 
 * URL: /:username/:recipeName/edit
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const RecipeEdit = () => {
  const { username, recipeName } = useParams();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user'));
  
  // Verify ownership
  if (!currentUser || currentUser.username !== username) {
    navigate('/');
    return null;
  }
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    picture: '',
    description: '',
    tags: '',
    isPublic: true
  });
  
  // Dynamic lists
  const [ingredients, setIngredients] = useState([]);
  const [method, setMethod] = useState([]);
  const [notes, setNotes] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  /**
   * Fetch existing recipe data
   */
  useEffect(() => {
    fetchRecipe();
  }, [username, recipeName]);
  
  const fetchRecipe = async () => {
    setLoading(true);
    try {
      const response = await api.recipes.getOne(username, recipeName);
      const recipe = response.data.recipe;
      
      setFormData({
        name: recipe.name,
        picture: recipe.picture || '',
        description: recipe.description || '',
        tags: recipe.tags ? recipe.tags.join(', ') : '',
        isPublic: recipe.isPublic
      });
      
      setIngredients(recipe.ingredients);
      setMethod(recipe.method);
      setNotes(recipe.notes || []);
    } catch (err) {
      console.error('Error fetching recipe:', err);
      setError('Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };
  
  // All the same handlers as RecipeCreate
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...ingredients];
    newIngredients[index][field] = value;
    setIngredients(newIngredients);
  };
  
  const addIngredient = () => {
    setIngredients([...ingredients, { amount: '', unit: 'cup', description: '' }]);
  };
  
  const removeIngredient = (index) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };
  
  const handleMethodChange = (index, value) => {
    const newMethod = [...method];
    newMethod[index] = value;
    setMethod(newMethod);
  };
  
  const addMethodStep = () => {
    setMethod([...method, '']);
  };
  
  const removeMethodStep = (index) => {
    if (method.length > 1) {
      setMethod(method.filter((_, i) => i !== index));
    }
  };
  
  const handleNoteChange = (index, value) => {
    const newNotes = [...notes];
    newNotes[index] = value;
    setNotes(newNotes);
  };
  
  const addNote = () => {
    setNotes([...notes, '']);
  };
  
  const removeNote = (index) => {
    setNotes(notes.filter((_, i) => i !== index));
  };
  
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Recipe name is required');
      return false;
    }
    
    const validIngredients = ingredients.filter(ing =>
      ing.amount && ing.unit && ing.description.trim()
    );
    if (validIngredients.length === 0) {
      setError('At least one complete ingredient is required');
      return false;
    }
    
    const validMethod = method.filter(step => step.trim());
    if (validMethod.length === 0) {
      setError('At least one method step is required');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    
    try {
      const validIngredients = ingredients.filter(ing =>
        ing.amount && ing.unit && ing.description.trim()
      ).map(ing => ({
        ...ing,
        amount: parseFloat(ing.amount)
      }));
      
      const validMethod = method.filter(step => step.trim());
      const validNotes = notes.filter(note => note.trim());
      
      const tagArray = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];
      
      const recipeData = {
        picture: formData.picture.trim() || null,
        description: formData.description.trim() || null,
        tags: tagArray,
        ingredients: validIngredients,
        method: validMethod,
        notes: validNotes,
        isPublic: formData.isPublic
      };
      
      await api.recipes.update(username, recipeName, recipeData);
      navigate(`/${username}/${recipeName}`);
    } catch (err) {
      console.error('Error updating recipe:', err);
      setError(err.response?.data?.message || 'Failed to update recipe');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }
  
  // The JSX is identical to RecipeCreate, just with "Edit" instead of "Create"
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Edit Recipe</h1>
      
      {error && (
        <div className="alert alert-error mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      
      {/* Form is identical to RecipeCreate - same structure */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Same form fields as RecipeCreate... */}
        
        <div className="flex gap-4">
          <button
            type="submit"
            className="btn btn-primary flex-grow"
            disabled={saving}
          >
            {saving ? <span className="loading loading-spinner"></span> : 'Update Recipe'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/${username}/${recipeName}`)}
            className="btn btn-ghost"
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default RecipeEdit;
