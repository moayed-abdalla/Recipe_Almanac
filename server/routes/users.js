/**
 * USER ROUTES
 * 
 * Handles user profile and statistics:
 * - GET /api/users/:username - Get user profile
 * - PUT /api/users/:username - Update profile (auth required)
 * - GET /api/users/:username/recipes - Get user's recipes
 * - GET /api/users/:username/stats - Get user statistics
 */

const express = require('express');
const router = express.Router();
const { query } = require('../database/pool');
const { authenticateToken } = require('./Auth');
const { param, body, validationResult } = require('express-validator');

// ========================================
// GET USER PROFILE
// ========================================

/**
 * GET /api/users/:username
 * 
 * Get public profile information for a user.
 * 
 * Response:
 * - 200: { success: true, user: object }
 * - 404: User not found
 */
router.get(
  '/:username',
  [
    param('username').trim().notEmpty().withMessage('Username is required')
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    try {
      const { username } = req.params;
      
      // Get user profile
      const result = await query(
        `SELECT 
          username,
          email,
          profile_picture,
          profile_description,
          created_at
        FROM users
        WHERE username = $1`,
        [username]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      const user = result.rows;
      
      res.json({
        success: true,
        user: {
          username: user.username,
          email: user.email,
          profilePicture: user.profile_picture,
          profileDescription: user.profile_description,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch user profile' 
      });
    }
  }
);

// ========================================
// UPDATE USER PROFILE
// ========================================

/**
 * PUT /api/users/:username
 * 
 * Update user profile (authentication required, owner only).
 * 
 * Request Body:
 * - email: string (optional, valid email)
 * - profilePicture: string (optional, valid URL)
 * - profileDescription: string (optional, max 500 chars)
 * 
 * Response:
 * - 200: { success: true, user: object }
 * - 403: Not authorized (trying to edit another user's profile)
 * - 404: User not found
 */
router.put(
  '/:username',
  authenticateToken,
  [
    param('username').trim().notEmpty(),
    body('email')
      .optional({ nullable: true })
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('profilePicture')
      .optional({ nullable: true })
      .trim()
      .isURL().withMessage('Profile picture must be a valid URL'),
    body('profileDescription')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 500 }).withMessage('Description must be 500 characters or less')
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    try {
      const { username } = req.params;
      const currentUser = req.user.username;
      
      // Check if user is updating their own profile
      if (username !== currentUser) {
        return res.status(403).json({ 
          success: false, 
          message: 'You can only update your own profile' 
        });
      }
      
      const { email, profilePicture, profileDescription } = req.body;
      
      // Update user profile
      const result = await query(
        `UPDATE users SET
          email = COALESCE($1, email),
          profile_picture = COALESCE($2, profile_picture),
          profile_description = COALESCE($3, profile_description)
        WHERE username = $4
        RETURNING username, email, profile_picture, profile_description, created_at`,
        [email, profilePicture, profileDescription, username]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      const user = result.rows;
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          username: user.username,
          email: user.email,
          profilePicture: user.profile_picture,
          profileDescription: user.profile_description,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update profile' 
      });
    }
  }
);

// ========================================
// GET USER'S RECIPES
// ========================================

/**
 * GET /api/users/:username/recipes
 * 
 * Get all recipes created by a specific user.
 * Only returns public recipes unless user is viewing their own profile.
 * 
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * 
 * Response:
 * - 200: { success: true, recipes: array, pagination: object }
 * - 404: User not found
 */
router.get(
  '/:username/recipes',
  [
    param('username').trim().notEmpty()
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    try {
      const { username } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      // Check if user exists
      const userCheck = await query(
        'SELECT username FROM users WHERE username = $1',
        [username]
      );
      
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // Determine if we should show private recipes
      // (only if viewing own profile and authenticated)
      const currentUser = req.user?.username;
      const showPrivate = currentUser === username;
      
      // Build WHERE clause
      const whereClause = showPrivate 
        ? 'owner = $1' 
        : 'owner = $1 AND is_public = true';
      
      // Calculate pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) FROM recipes WHERE ${whereClause}`,
        [username]
      );
      const total = parseInt(countResult.rows.count);
      
      // Get recipes
      const result = await query(
        `SELECT 
          owner,
          name,
          picture,
          description,
          tags,
          view_count,
          is_public,
          created_at,
          updated_at
        FROM recipes
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
        [username, parseInt(limit), offset]
      );
      
      res.json({
        success: true,
        recipes: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching user recipes:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch recipes' 
      });
    }
  }
);

// ========================================
// GET USER STATISTICS
// ========================================

/**
 * GET /api/users/:username/stats
 * 
 * Get statistics about a user's recipes.
 * 
 * Returns:
 * - totalRecipes: Total number of recipes
 * - totalViews: Sum of all recipe views
 * - averageViews: Average views per recipe
 * - mostViewedRecipe: Recipe with most views
 * - popularTags: Most used tags with counts
 * 
 * Response:
 * - 200: { success: true, stats: object }
 * - 404: User not found
 */
router.get(
  '/:username/stats',
  [
    param('username').trim().notEmpty()
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    try {
      const { username } = req.params;
      
      // Check if user exists
      const userCheck = await query(
        'SELECT username FROM users WHERE username = $1',
        [username]
      );
      
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // Get basic statistics
      const statsResult = await query(
        `SELECT 
          COUNT(*) as total_recipes,
          COALESCE(SUM(view_count), 0) as total_views,
          COALESCE(ROUND(AVG(view_count)), 0) as average_views
        FROM recipes
        WHERE owner = $1 AND is_public = true`,
        [username]
      );
      
      const stats = statsResult.rows;
      
      // Get most viewed recipe
      const mostViewedResult = await query(
        `SELECT name, view_count
        FROM recipes
        WHERE owner = $1 AND is_public = true
        ORDER BY view_count DESC
        LIMIT 1`,
        [username]
      );
      
      const mostViewedRecipe = mostViewedResult.rows || null;
      
      // Get popular tags
      const tagsResult = await query(
        `SELECT unnest(tags) as tag, COUNT(*) as count
        FROM recipes
        WHERE owner = $1 AND is_public = true
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 10`,
        [username]
      );
      
      res.json({
        success: true,
        stats: {
          totalRecipes: parseInt(stats.total_recipes),
          totalViews: parseInt(stats.total_views),
          averageViews: parseInt(stats.average_views),
          mostViewedRecipe: mostViewedRecipe ? {
            name: mostViewedRecipe.name,
            views: mostViewedRecipe.view_count
          } : null,
          popularTags: tagsResult.rows
        }
      });
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch statistics' 
      });
    }
  }
);

module.exports = router;
