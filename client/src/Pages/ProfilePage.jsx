/**
 * PROFILE PAGE
 * 
 * User profile management page.
 * Allows users to view and edit their profile information.
 * Shows user statistics and recent recipes.
 * 
 * Requires authentication.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import api from '../services/api';

const ProfilePage = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user'));
  
  // Redirect if not authenticated
  if (!currentUser) {
    navigate('/login');
    return null;
  }
  
  // State management
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Form data for editing
  const [formData, setFormData] = useState({
    profilePicture: '',
    profileDescription: '',
    email: ''
  });
  
  /**
   * Fetch profile and stats on mount
   */
  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);
  
  /**
   * Fetch user profile
   */
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await api.auth.me();
      setProfile(response.data.user);
      setFormData({
        profilePicture: response.data.user.profilePicture || '',
        profileDescription: response.data.user.profileDescription || '',
        email: response.data.user.email || ''
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Fetch user statistics
   */
  const fetchStats = async () => {
    try {
      const response = await api.users.getStats(currentUser.username);
      setStats(response.data.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };
  
  /**
   * Handle form input changes
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  /**
   * Handle profile update
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      await api.users.updateProfile(currentUser.username, formData);
      
      // Update local storage
      const updatedUser = {
        ...currentUser,
        profilePicture: formData.profilePicture,
        email: formData.email
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Refresh profile data
      await fetchProfile();
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };
  
  /**
   * Cancel editing
   */
  const handleCancel = () => {
    setFormData({
      profilePicture: profile.profilePicture || '',
      profileDescription: profile.profileDescription || '',
      email: profile.email || ''
    });
    setIsEditing(false);
    setError(null);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>
      
      {error && (
        <div className="alert alert-error mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2">
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              {!isEditing ? (
                /* View Mode */
                <>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="avatar">
                      <div className="w-24 rounded-full">
                        <img
                          src={profile?.profilePicture || 'https://img.daisyui.com/images/profile/demo/batperson@192.webp'}
                          alt={profile?.username}
                        />
                      </div>
                    </div>
                    <div className="flex-grow">
                      <h2 className="card-title text-2xl">{profile?.username}</h2>
                      <p className="opacity-70">{profile?.email || 'No email provided'}</p>
                      <p className="text-sm opacity-50 mt-2">
                        Member since {new Date(profile?.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {profile?.profileDescription && (
                    <div className="mb-4">
                      <h3 className="font-semibold mb-2">About</h3>
                      <p>{profile.profileDescription}</p>
                    </div>
                  )}
                  
                  <div className="card-actions justify-end">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn btn-primary"
                    >
                      Edit Profile
                    </button>
                  </div>
                </>
              ) : (
                /* Edit Mode */
                <form onSubmit={handleSubmit}>
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text">Profile Picture URL</span>
                    </label>
                    <input
                      type="url"
                      name="profilePicture"
                      value={formData.profilePicture}
                      onChange={handleChange}
                      className="input input-bordered"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text">Email (optional)</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="input input-bordered"
                      placeholder="your@email.com"
                    />
                  </div>
                  
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text">About / Bio</span>
                    </label>
                    <textarea
                      name="profileDescription"
                      value={formData.profileDescription}
                      onChange={handleChange}
                      className="textarea textarea-bordered h-32"
                      placeholder="Tell others about yourself..."
                      maxLength={500}
                    />
                    <label className="label">
                      <span className="label-text-alt opacity-70">
                        {formData.profileDescription.length}/500 characters
                      </span>
                    </label>
                  </div>
                  
                  <div className="card-actions justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="btn btn-ghost"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving ? <span className="loading loading-spinner"></span> : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
        
        {/* Statistics Card */}
        <div className="space-y-4">
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">Statistics</h3>
              
              {stats ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-sm opacity-70">Total Recipes</div>
                    <div className="text-2xl font-bold">{stats.totalRecipes}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm opacity-70">Total Views</div>
                    <div className="text-2xl font-bold">{stats.totalViews}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm opacity-70">Average Views</div>
                    <div className="text-2xl font-bold">{stats.averageViews}</div>
                  </div>
                  
                  {stats.mostViewedRecipe && (
                    <div>
                      <div className="text-sm opacity-70">Most Viewed Recipe</div>
                      <Link
                        to={`/${currentUser.username}/${stats.mostViewedRecipe.name}`}
                        className="text-primary hover:underline"
                      >
                        {stats.mostViewedRecipe.name}
                      </Link>
                      <div className="text-xs opacity-50">
                        {stats.mostViewedRecipe.views} views
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-center">
                  <span className="loading loading-spinner"></span>
                </div>
              )}
            </div>
          </div>
          
          {/* Popular Tags */}
          {stats?.popularTags && stats.popularTags.length > 0 && (
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">Popular Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {stats.popularTags.slice(0, 10).map((tag, index) => (
                    <div key={index} className="badge badge-primary">
                      {tag.tag} ({tag.count})
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Quick Links */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">Quick Links</h3>
              <div className="space-y-2">
                <Link to="/almanac" className="btn btn-outline btn-block">
                  My Almanac
                </Link>
                <Link to="/recipe/new" className="btn btn-outline btn-block">
                  Create Recipe
                </Link>
                <Link to={`/users/${currentUser.username}/recipes`} className="btn btn-outline btn-block">
                  View My Recipes
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
