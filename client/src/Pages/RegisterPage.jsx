/**
 * REGISTER PAGE
 * 
 * User registration form with validation.
 * Creates new account and automatically logs in on success.
 * 
 * Props:
 * - onLogin: function(token, user) - Called after successful registration
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import api from '../services/api';

const RegisterPage = ({ onLogin }) => {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: ''
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  
  /**
   * Handle input changes
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (error) setError(null);
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  /**
   * Validate form data
   */
  const validateForm = () => {
    const errors = {};
    
    // Username validation
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (formData.username.length > 50) {
      errors.username = 'Username must be 50 characters or less';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    // Email validation (optional)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await api.auth.register({
        username: formData.username.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        email: formData.email.trim() || undefined
      });
      
      const { token, user } = response.data;
      
      // Call parent's onLogin handler
      onLogin(token, user);
      
      // Navigate to home
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err);
      
      // Handle validation errors from server
      if (err.response?.data?.errors) {
        const serverErrors = {};
        err.response.data.errors.forEach(error => {
          serverErrors[error.path] = error.msg;
        });
        setValidationErrors(serverErrors);
      } else {
        setError(err.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="card w-full max-w-md bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-3xl mb-6 justify-center">
            Join Recipe Almanac
          </h2>
          
          {error && (
            <div className="alert alert-error mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Username *</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={`input input-bordered ${validationErrors.username ? 'input-error' : ''}`}
                placeholder="Choose a username"
                required
                autoComplete="username"
                disabled={loading}
              />
              {validationErrors.username && (
                <label className="label">
                  <span className="label-text-alt text-error">{validationErrors.username}</span>
                </label>
              )}
              <label className="label">
                <span className="label-text-alt opacity-70">
                  3-50 characters, letters, numbers, and underscores only
                </span>
              </label>
            </div>
            
            {/* Email Field (Optional) */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email (optional)</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`input input-bordered ${validationErrors.email ? 'input-error' : ''}`}
                placeholder="your@email.com"
                autoComplete="email"
                disabled={loading}
              />
              {validationErrors.email && (
                <label className="label">
                  <span className="label-text-alt text-error">{validationErrors.email}</span>
                </label>
              )}
              <label className="label">
                <span className="label-text-alt opacity-70">
                  Only used for account recovery
                </span>
              </label>
            </div>
            
            {/* Password Field */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Password *</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`input input-bordered ${validationErrors.password ? 'input-error' : ''}`}
                placeholder="Choose a strong password"
                required
                autoComplete="new-password"
                disabled={loading}
              />
              {validationErrors.password && (
                <label className="label">
                  <span className="label-text-alt text-error">{validationErrors.password}</span>
                </label>
              )}
              <label className="label">
                <span className="label-text-alt opacity-70">
                  At least 6 characters
                </span>
              </label>
            </div>
            
            {/* Confirm Password Field */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Confirm Password *</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`input input-bordered ${validationErrors.confirmPassword ? 'input-error' : ''}`}
                placeholder="Re-enter your password"
                required
                autoComplete="new-password"
                disabled={loading}
              />
              {validationErrors.confirmPassword && (
                <label className="label">
                  <span className="label-text-alt text-error">{validationErrors.confirmPassword}</span>
                </label>
              )}
            </div>
            
            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
          
          {/* Login Link */}
          <div className="divider">OR</div>
          <div className="text-center">
            <p className="mb-2">Already have an account?</p>
            <Link to="/login" className="btn btn-outline w-full">
              Login
            </Link>
          </div>
          
          {/* Privacy Info */}
          <div className="alert alert-info mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div className="text-sm">
              <p>We respect your privacy:</p>
              <ul className="list-disc list-inside mt-1">
                <li>No ads or tracking</li>
                <li>Email is optional</li>
                <li>Open source and transparent</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
