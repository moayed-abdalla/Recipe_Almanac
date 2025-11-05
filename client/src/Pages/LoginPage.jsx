/**
 * LOGIN PAGE
 * 
 * User login form with validation.
 * Redirects to home page after successful login.
 * 
 * Props:
 * - onLogin: function(token, user) - Called after successful login
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import api from '../services/api';

const LoginPage = ({ onLogin }) => {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  /**
   * Handle input changes
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };
  
  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Basic validation
    if (!formData.username.trim() || !formData.password) {
      setError('Please enter both username and password');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await api.auth.login(formData);
      const { token, user } = response.data;
      
      // Call parent's onLogin handler
      onLogin(token, user);
      
      // Navigate to home
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-md bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-3xl mb-6 justify-center">
            Login to Recipe Almanac
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
                <span className="label-text">Username</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="input input-bordered"
                placeholder="Enter your username"
                required
                autoComplete="username"
                disabled={loading}
              />
            </div>
            
            {/* Password Field */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input input-bordered"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                disabled={loading}
              />
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
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>
          
          {/* Register Link */}
          <div className="divider">OR</div>
          <div className="text-center">
            <p className="mb-2">Don't have an account?</p>
            <Link to="/register" className="btn btn-outline w-full">
              Create Account
            </Link>
          </div>
          
          {/* Info */}
          <div className="alert alert-info mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div className="text-sm">
              <p>Recipe Almanac is ad-free and always will be.</p>
              <p>Your email is optional and only used for login.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
