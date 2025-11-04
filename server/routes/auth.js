/**
 * AUTHENTICATION ROUTES
 * 
 * Handles user authentication and registration:
 * - POST /api/auth/register - Create new user account
 * - POST /api/auth/login - Login and receive JWT token
 * - GET /api/auth/me - Get current authenticated user info
 * 
 * Also exports the authenticateToken middleware for use in other routes.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../database/pool');
const { body, validationResult } = require('express-validator');

// ========================================
// JWT MIDDLEWARE
// ========================================

/**
 * Authentication Middleware
 * 
 * Verifies JWT token from Authorization header.
 * Attaches user data to req.user if valid.
 * 
 * Usage: Add to any route that requires authentication
 * Example: router.get('/protected', authenticateToken, handler)
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticateToken = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' '); // Format: "Bearer TOKEN"
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }
  
  // Verify token
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
    
    // Attach user data to request
    req.user = user;
    next();
  });
};

// ========================================
// REGISTER ENDPOINT
// ========================================

/**
 * POST /api/auth/register
 * 
 * Create a new user account.
 * 
 * Request Body:
 * - username: string (required, 3-50 chars, alphanumeric + underscore)
 * - password: string (required, min 6 chars)
 * - confirmPassword: string (required, must match password)
 * - email: string (optional, valid email format)
 * 
 * Response:
 * - 201: { success: true, token: string, user: object }
 * - 400: Validation errors
 * - 409: Username already exists
 */
router.post(
  '/register',
  [
    // Validation rules
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
      .notEmpty().withMessage('Username is required'),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
      .notEmpty().withMessage('Password is required'),
    body('confirmPassword')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match'),
    body('email')
      .optional({ nullable: true, checkFalsy: true })
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail()
  ],
  async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    try {
      const { username, password, email } = req.body;
      
      // Check if username already exists
      const existingUser = await query(
        'SELECT username FROM users WHERE username = $1',
        [username]
      );
      
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ 
          success: false, 
          message: 'Username already exists' 
        });
      }
      
      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Insert new user
      const result = await query(
        `INSERT INTO users (username, password, email) 
         VALUES ($1, $2, $3) 
         RETURNING username, email, profile_picture, created_at`,
        [username, hashedPassword, email || null]
      );
      
      const user = result.rows;
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          username: user.username,
          email: user.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' } // Token expires in 7 days
      );
      
      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user: {
          username: user.username,
          email: user.email,
          profilePicture: user.profile_picture,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create account' 
      });
    }
  }
);

// ========================================
// LOGIN ENDPOINT
// ========================================

/**
 * POST /api/auth/login
 * 
 * Authenticate user and receive JWT token.
 * 
 * Request Body:
 * - username: string (required)
 * - password: string (required)
 * 
 * Response:
 * - 200: { success: true, token: string, user: object }
 * - 400: Missing credentials
 * - 401: Invalid credentials
 */
router.post(
  '/login',
  [
    // Validation rules
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required'),
    body('password')
      .notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    try {
      const { username, password } = req.body;
      
      // Get user from database
      const result = await query(
        `SELECT username, password, email, profile_picture, created_at 
         FROM users 
         WHERE username = $1`,
        [username]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid username or password' 
        });
      }
      
      const user = result.rows;
      
      // Compare passwords
      const passwordMatch = await bcrypt.compare(password, user.password);
      
      if (!passwordMatch) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid username or password' 
        });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          username: user.username,
          email: user.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          username: user.username,
          email: user.email,
          profilePicture: user.profile_picture,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Login failed' 
      });
    }
  }
);

// ========================================
// GET CURRENT USER ENDPOINT
// ========================================

/**
 * GET /api/auth/me
 * 
 * Get current authenticated user information.
 * Requires valid JWT token in Authorization header.
 * 
 * Headers:
 * - Authorization: Bearer <token>
 * 
 * Response:
 * - 200: { success: true, user: object }
 * - 401: Missing or invalid token
 * - 404: User not found
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const username = req.user.username;
    
    // Get user data from database
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
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user data' 
    });
  }
});

// Export router and middleware
module.exports = router;
module.exports.authenticateToken = authenticateToken;
