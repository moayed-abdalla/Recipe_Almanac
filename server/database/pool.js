/**
 * DATABASE CONNECTION POOL
 * 
 * PostgreSQL connection pool using ES modules.
 */

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Load environment variables
dotenv.config();

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase
  },
  max: 20, // Maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Connected to Supabase database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Query function
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

export default pool;
