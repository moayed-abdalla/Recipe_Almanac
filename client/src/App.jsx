/**
 * APP COMPONENT
 * 
 * Main application component that sets up:
 * - React Router for navigation
 * - Theme management (light/dark mode)
 * - Authentication state
 * - Global layout with Header and Footer
 * 
 * This component wraps all pages and manages global state.
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';

// Page imports
import Home from './pages/Home'; 
import RecipePage from './pages/RecipePage';
import RecipeCreate from './pages/RecipeCreate';
import RecipeEdit from './pages/RecipeEdit';
import AlmanacPage from './pages/AlmanacPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function App() {
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
  /**
   * Theme state
   * Values: 'recipeLight' or 'recipeDark'
   * Persisted to localStorage
   */
  const [theme, setTheme] = useState(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme;
    }
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'recipeDark';
    }
    
    return 'recipeLight';
  });
  
  /**
   * Authentication state
   * Checks if user is logged in based on token in localStorage
   */
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('token');
  });
  
  /**
   * Current user data
   * Retrieved from localStorage
   */
  const [currentUser, setCurrentUser] = useState(() => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  });
  
  // ========================================
  // EFFECTS
  // ========================================
  
  /**
   * Persist theme changes to localStorage
   * Updates whenever theme changes
   */
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // ========================================
  // HANDLERS
  // ========================================
  
  /**
   * Toggle Theme Handler
   * Switches between light and dark themes
   */
  const toggleTheme = () => {
    setTheme(prevTheme => 
      prevTheme === 'recipeLight' ? 'recipeDark' : 'recipeLight'
    );
  };
  
  /**
   * Login Handler
   * Called when user successfully logs in or registers
   * 
   * @param {string} token - JWT authentication token
   * @param {object} user - User data { username, profilePicture, email }
   */
  const handleLogin = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setIsAuthenticated(true);
    setCurrentUser(user);
  };
  
  /**
   * Logout Handler
   * Clears authentication and redirects to home
   */
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    window.location.href = '/';
  };
  
  // ========================================
  // PROTECTED ROUTE WRAPPER
  // ========================================
  
  /**
   * Protected Route Component
   * Redirects to login if user is not authenticated
   * 
   * @param {ReactNode} children - Component to render if authenticated
   */
  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };
  
  // ========================================
  // RENDER
  // ========================================
  
  return (
    <Router>
      <div className="min-h-screen flex flex-col" data-theme={theme}>
        {/* Global Header */}
        <Header 
          theme={theme}
          toggleTheme={toggleTheme}
          isAuthenticated={isAuthenticated}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        
        {/* Main Content Area */}
        <main className="flex-grow">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="/register" element={<RegisterPage onLogin={handleLogin} />} />
            
            {/* Recipe Routes */}
            <Route path="/:username/:recipeName" element={<RecipePage />} />
            <Route path="/:username/:recipeName/edit" element={
              <ProtectedRoute>
                <RecipeEdit />
              </ProtectedRoute>
            } />
            
            {/* Protected Routes */}
            <Route path="/recipe/new" element={
              <ProtectedRoute>
                <RecipeCreate />
              </ProtectedRoute>
            } />
            
            <Route path="/almanac" element={
              <ProtectedRoute>
                <AlmanacPage />
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            
            {/* User Profile Routes */}
            <Route path="/users/:username" element={<ProfilePage />} />
            <Route path="/users/:username/recipes" element={<Home />} />
            
            {/* 404 Catch-all */}
            <Route path="*" element={
              <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
                <p className="mb-8">The page you're looking for doesn't exist.</p>
                <a href="/" className="btn btn-primary">Go Home</a>
              </div>
            } />
          </Routes>
        </main>
        
        {/* Global Footer */}
        <Footer />
      </div>
    </Router>
  );
}

export default App;
