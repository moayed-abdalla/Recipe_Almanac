/**
 * RECIPE ROUTES
 * 
 * Handles all recipe-related operations:
 * - GET /api/recipes - Get all recipes with filtering, sorting, pagination
 * - GET /api/recipes/:username/:recipeName - Get single recipe by owner and name
 * - POST /api/recipes - Create new recipe (auth required)
 * - PUT /api/recipes/:username/:recipeName - Update recipe (auth required, owner only)
 * - DELETE /api/recipes/:username/:recipeName - Delete recipe (auth required, owner only)
 */

import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../database/pool.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// ========================================
// GET ALL RECIPES
// ========================================

/**
 * GET /api/recipes
 * 
 * Get all public recipes with optional filtering, sorting, and pagination.
 * 
 * Query Parameters:
 * - search: string - Search in recipe name and description
 * - tag: string - Filter by specific tag
 * - sort: string - Sort field ('views', 'created', 'name')
 * - order: string - Sort order ('asc' or 'desc')
 * - page: number - Page number (default: 1)
 * - limit: number - Items per page (default: 20)
 */
router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      tag = '',
      sort = 'views',
      order = 'desc',
      page = 1,
      limit = 20
    } = req.query;
    
    // Build WHERE clause
    const conditions = ['is_public = true'];
    const params = [];
    let paramCount = 1;
    
    // Search filter
    if (search) {
      conditions.push(`(name ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }
    
    // Tag filter
    if (tag) {
      conditions.push(`$${paramCount} = ANY(tags)`);
      params.push(tag);
      paramCount++;
    }
    
    const whereClause = conditions.join(' AND ');
    
    // Validate sort field
    const validSortFields = {
      views: 'view_count',
      created: 'created_at',
      name: 'name'
    };
    const sortField = validSortFields[sort] || 'view_count';
    
    // Validate sort order
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM recipes WHERE ${whereClause}`,
      params
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
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, parseInt(limit), offset]
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
    console.error('Error fetching recipes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch recipes' 
    });
  }
});

// ========================================
// GET SINGLE RECIPE
// ========================================

/**
 * GET /api/recipes/:username/:recipeName
 * 
 * Get a single recipe by owner username and recipe name.
 * Increments view count automatically.
 */
router.get(
  '/:username/:recipeName',
  [
    param('username').trim().notEmpty().withMessage('Username is required'),
    param('recipeName').trim().notEmpty().withMessage('Recipe name is required')
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
      const { username, recipeName } = req.params;
      
      // Get recipe
      const result = await query(
        `SELECT 
          owner,
          name,
          picture,
          description,
          tags,
          ingredients,
          method,
          notes,
          view_count,
          is_public,
          created_at,
          updated_at
        FROM recipes
        WHERE owner = $1 AND name = $2`,
        [username, recipeName]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Recipe not found' 
        });
      }
      
      const recipe = result.rows;
      
      // Check if recipe is public or if user is the owner
      const currentUser = req.user?.username;
      if (!recipe.is_public && recipe.owner !== currentUser) {
        return res.status(403).json({ 
          success: false, 
          message: 'This recipe is private' 
        });
      }
      
      // Increment view count (fire and forget)
      query(
        'UPDATE recipes SET view_count = view_count + 1 WHERE owner = $1 AND name = $2',
        [username, recipeName]
      ).catch(err => console.error('Error updating view count:', err));
      
      res.json({
        success: true,
        recipe
      });
    } catch (error) {
      console.error('Error fetching recipe:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch recipe' 
      });
    }
  }
);

// ========================================
// CREATE RECIPE
// ========================================

/**
 * POST /api/recipes
 * 
 * Create a new recipe (authentication required).
 * Recipe name must be unique per user.
 */
router.post(
  '/',
  authenticateToken,
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Recipe name is required')
      .isLength({ max: 255 }).withMessage('Recipe name must be 255 characters or less'),
    body('picture')
      .optional({ nullable: true })
      .trim()
      .isURL().withMessage('Picture must be a valid URL'),
    body('description')
      .optional({ nullable: true })
      .trim(),
    body('tags')
      .optional()
      .isArray().withMessage('Tags must be an array'),
    body('ingredients')
      .isArray({ min: 1 }).withMessage('At least one ingredient is required'),
    body('ingredients.*.amount')
      .isFloat({ min: 0 }).withMessage('Ingredient amount must be a positive number'),
    body('ingredients.*.unit')
      .trim()
      .notEmpty().withMessage('Ingredient unit is required'),
    body('ingredients.*.description')
      .trim()
      .notEmpty().withMessage('Ingredient description is required'),
    body('method')
      .isArray({ min: 1 }).withMessage('At least one method step is required'),
    body('notes')
      .optional()
      .isArray().withMessage('Notes must be an array'),
    body('isPublic')
      .optional()
      .isBoolean().withMessage('isPublic must be a boolean')
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
      const {
        name,
        picture = null,
        description = null,
        tags = [],
        ingredients,
        method,
        notes = [],
        isPublic = true
      } = req.body;
      
      const owner = req.user.username;
      
      // Check if recipe name already exists for this user
      const existingRecipe = await query(
        'SELECT name FROM recipes WHERE owner = $1 AND name = $2',
        [owner, name]
      );
      
      if (existingRecipe.rows.length > 0) {
        return res.status(409).json({ 
          success: false, 
          message: 'You already have a recipe with this name' 
        });
      }
      
      // Insert recipe
      const result = await query(
        `INSERT INTO recipes (
          owner, name, picture, description, tags,
          ingredients, method, notes, is_public
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          owner,
          name,
          picture,
          description,
          tags,
          JSON.stringify(ingredients),
          JSON.stringify(method),
          JSON.stringify(notes),
          isPublic
        ]
      );
      
      res.status(201).json({
        success: true,
        message: 'Recipe created successfully',
        recipe: result.rows
      });
    } catch (error) {
      console.error('Error creating recipe:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create recipe' 
      });
    }
  }
);

// ========================================
// UPDATE RECIPE
// ========================================

/**
 * PUT /api/recipes/:username/:recipeName
 * 
 * Update an existing recipe (authentication required, owner only).
 * Recipe name cannot be changed.
 */
router.put(
  '/:username/:recipeName',
  authenticateToken,
  [
    param('username').trim().notEmpty(),
    param('recipeName').trim().notEmpty(),
    body('picture').optional({ nullable: true }).trim(),
    body('description').optional({ nullable: true }).trim(),
    body('tags').optional().isArray(),
    body('ingredients').isArray({ min: 1 }),
    body('method').isArray({ min: 1 }),
    body('notes').optional().isArray(),
    body('isPublic').optional().isBoolean()
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
      const { username, recipeName } = req.params;
      const currentUser = req.user.username;
      
      // Check ownership
      if (username !== currentUser) {
        return res.status(403).json({ 
          success: false, 
          message: 'You can only edit your own recipes' 
        });
      }
      
      const {
        picture,
        description,
        tags,
        ingredients,
        method,
        notes,
        isPublic
      } = req.body;
      
      // Update recipe
      const result = await query(
        `UPDATE recipes SET
          picture = COALESCE($1, picture),
          description = COALESCE($2, description),
          tags = COALESCE($3, tags),
          ingredients = $4,
          method = $5,
          notes = COALESCE($6, notes),
          is_public = COALESCE($7, is_public),
          updated_at = CURRENT_TIMESTAMP
        WHERE owner = $8 AND name = $9
        RETURNING *`,
        [
          picture,
          description,
          tags,
          JSON.stringify(ingredients),
          JSON.stringify(method),
          JSON.stringify(notes),
          isPublic,
          username,
          recipeName
        ]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Recipe not found' 
        });
      }
      
      res.json({
        success: true,
        message: 'Recipe updated successfully',
        recipe: result.rows
      });
    } catch (error) {
      console.error('Error updating recipe:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update recipe' 
      });
    }
  }
);

// ========================================
// DELETE RECIPE
// ========================================

/**
 * DELETE /api/recipes/:username/:recipeName
 * 
 * Delete a recipe (authentication required, owner only).
 * Also removes all almanac entries referencing this recipe.
 */
router.delete(
  '/:username/:recipeName',
  authenticateToken,
  [
    param('username').trim().notEmpty(),
    param('recipeName').trim().notEmpty()
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
      const { username, recipeName } = req.params;
      const currentUser = req.user.username;
      
      // Check ownership
      if (username !== currentUser) {
        return res.status(403).json({ 
          success: false, 
          message: 'You can only delete your own recipes' 
        });
      }
      
      // Delete recipe (CASCADE will delete almanac entries)
      const result = await query(
        'DELETE FROM recipes WHERE owner = $1 AND name = $2 RETURNING name',
        [username, recipeName]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Recipe not found' 
        });
      }
      
      res.json({
        success: true,
        message: 'Recipe deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting recipe:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete recipe' 
      });
    }
  }
);

module.exports = router;
