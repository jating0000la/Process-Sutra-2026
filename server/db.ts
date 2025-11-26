import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";

// Load environment variables from .env file
const env = dotenv.config();
dotenvExpand.expand(env);

// Get DATABASE_URL from environment variables (loaded from .env file)
const databaseUrl = process.env.DATABASE_URL;

// Validate DATABASE_URL is set
if (!databaseUrl) {
  const errorMessage = 'DATABASE_URL environment variable is not set. Please configure it in your .env file.';
  console.error('❌', errorMessage);
  throw new Error(errorMessage);
}

console.log('Connecting to database...');
console.log('Database host:', databaseUrl.split('@')[1]?.split('/')[0] || 'unknown');

// Create a PostgreSQL pool
export const pool = new Pool({ 
  connectionString: databaseUrl,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

// Test the connection
let dbConnected = false;

const testConnection = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Successfully connected to PostgreSQL database');
    dbConnected = true;
  } catch (err) {
    console.error('❌ Failed to connect to PostgreSQL database:', err);
    console.error('Please verify your DATABASE_URL in the .env file and ensure PostgreSQL is running.');
    dbConnected = false;
  }
};

// Test connection but don't block server startup
testConnection();

// Export connection status checker
export const isDatabaseConnected = () => dbConnected;

// Create a Drizzle ORM instance
export const db = drizzle(pool, { schema });