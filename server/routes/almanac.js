/**
 * ALMANAC ROUTES
 * 
 * Handles user's saved recipe collection (almanac):
 * - GET /api/almanac/:username - Get user's saved recipes
 * - POST /api/almanac - Save recipe to almanac (auth required)
 * - DELETE /api/almanac - Remove recipe from almanac (auth required)
 * - GET /api/almanac/:username/check/:owner/:recipe - Check if recipe is saved
 */

const express = require('express');
const router = express.Router();
const { query } = require('../database/pool');
const { authenticateToken } = require('./auth');
const { param, body, validationResult } = require('express-validator');

// ========================================
// GET USER'S SAVED RECIPES
// ========================================

/**
 * GET /api/almanac/:username
 * 
 * Get all recipes saved in a user's almanac.
 * Can filter by owned/saved recipes and by tag.
 * 
 * Query Parameters:
 * - filter: string ('owned', 'saved', or 'all') - Default: 'all'
 * - tag: string - Filter by specific tag
 * 
 * Response:
 * - 200: { success: true, recipes: array, stats: object }
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
      const { filter = 'all', tag = '' } = req.query;
      
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
      
      // Build WHERE clause based on filter
      let whereConditions = ['a.username = $1'];
      const params = [username];
      let paramCount = 2;
      
      if (filter === 'owned') {
        whereConditions.push('r.owner = $1');
      } else if (filter === 'saved') {
        whereConditions.push('r.owner != $1');
      }
      
      // Add tag filter if provided
      if (tag) {
        whereConditions.push(`$${paramCount} = ANY(r.tags)`);
        params.push(tag);
        paramCount++;
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      // Get recipes from almanac
      const result = await query(
        `SELECT 
          r.owner,
          r.name,
          r.picture,
          r.description,
          r.tags,
          r.view_count,
          r.is_public,
          r.created_at,
          a.saved_at,
          CASE WHEN r.owner = $1 THEN false ELSE true END as is_saved
        FROM almanac a
        JOIN recipes r ON a.recipe_owner = r.owner AND a.recipe_name = r.name
        WHERE ${whereClause}
        ORDER BY a.saved_at DESC`,
        params
      );
      
      // Get statistics
      const statsResult = await query(
        `SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE recipe_owner = $1) as owned,
          COUNT(*) FILTER (WHERE recipe_owner != $1) as saved
        FROM almanac
        WHERE username = $1`,
        [username]
      );
      
      const stats = statsResult.rows;
      
      res.json({
        success: true,
        recipes: result.rows,
        stats: {
          total: parseInt(stats.total),
          owned: parseInt(stats.owned),
          saved: parseInt(stats.saved)
        }
      });
    } catch (error) {
      console.error('Error fetching almanac:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch almanac' 
      });
    }
  }
);

// ========================================
// SAVE RECIPE TO ALMANAC
// ========================================

/**
 * POST /api/almanac
 * 
 * Save a recipe to user's almanac (authentication required).
 * 
 * Request Body:
 * - recipeOwner: string (required) - Username of recipe owner
 * - recipeName: string (required) - Name of recipe
 * 
 * Response:
 * - 201: { success: true, message: string }
 * - 400: Validation errors
 * - 404: Recipe not found
 * - 409: Recipe already saved
 */
router.post(
  '/',
  authenticateToken,
  [
    body('recipeOwner')
      .trim()
      .notEmpty().withMessage('Recipe owner is required'),
    body('recipeName')
      .trim()
      .notEmpty().withMessage('Recipe name is required')
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
      const { recipeOwner, recipeName } = req.body;
      const username = req.user.username;
      
      // Check if recipe exists
      const recipeCheck = await query(
        'SELECT owner, name FROM recipes WHERE owner = $1 AND name = $2',
        [recipeOwner, recipeName]
      );
      
      if (recipeCheck.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Recipe not found' 
        });
      }
      
      // Check if already saved
      const existingEntry = await query(
        `SELECT * FROM almanac 
         WHERE username = $1 AND recipe_owner = $2 AND recipe_name = $3`,
        [username, recipeOwner, recipeName]
      );
      
      if (existingEntry.rows.length > 0) {
        return res.status(409).json({ 
          success: false, 
          message: 'Recipe already saved to almanac' 
        });
      }
      
      // Save to almanac
      await query(
        `INSERT INTO almanac (username, recipe_owner, recipe_name)
         VALUES ($1, $2, $3)`,
        [username, recipeOwner, recipeName]
      );
      
      res.status(201).json({
        success: true,
        message: 'Recipe saved to almanac'
      });
    } catch (error) {
      console.error('Error saving recipe to almanac:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to save recipe' 
      });
    }
  }
);

// ========================================
// REMOVE RECIPE FROM ALMANAC
// ========================================

/**
 * DELETE /api/almanac
 * 
 * Remove a recipe from user's almanac (authentication required).
 * 
 * Request Body:
 * - recipeOwner: string (required) - Username of recipe owner
 * - recipeName: string (required) - Name of recipe
 * 
 * Response:
 * - 200: { success: true, message: string }
 * - 400: Validation errors
 * - 404: Recipe not in almanac
 */
router.delete(
  '/',
  authenticateToken,
  [
    body('recipeOwner')
      .trim()
      .notEmpty().withMessage('Recipe owner is required'),
    body('recipeName')
      .trim()
      .notEmpty().withMessage('Recipe name is required')
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
      const { recipeOwner, recipeName } = req.body;
      const username = req.user.username;
      
      // Remove from almanac
      const result = await query(
        `DELETE FROM almanac 
         WHERE username = $1 AND recipe_owner = $2 AND recipe_name = $3
         RETURNING *`,
        [username, recipeOwner, recipeName]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Recipe not found in almanac' 
        });
      }
      
      res.json({
        success: true,
        message: 'Recipe removed from almanac'
      });
    } catch (error) {
      console.error('Error removing recipe from almanac:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to remove recipe' 
      });
    }
  }
);

// ========================================
// CHECK IF RECIPE IS SAVED
// ========================================

/**
 * GET /api/almanac/:username/check/:owner/:recipe
 * 
 * Check if a specific recipe is saved in user's almanac.
 * Useful for showing save/unsave button state.
 * 
 * Response:
 * - 200: { success: true, isSaved: boolean }
 */
router.get(
  '/:username/check/:owner/:recipe',
  [
    param('username').trim().notEmpty(),
    param('owner').trim().notEmpty(),
    param('recipe').trim().notEmpty()
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
      const { username, owner, recipe } = req.params;
      
      // Check if recipe is in almanac
      const result = await query(
        `SELECT * FROM almanac 
         WHERE username = $1 AND recipe_owner = $2 AND recipe_name = $3`,
        [username, owner, recipe]
      );
      
      res.json({
        success: true,
        isSaved: result.rows.length > 0
      });
    } catch (error) {
      console.error('Error checking almanac status:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to check almanac status' 
      });
    }
  }
);

module.exports = router;
