import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import fs from 'fs';
import path from 'path';

// Try to get DATABASE_URL from environment or .env.local file
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("DATABASE_URL not found in environment variables. Checking .env.local file...");
  try {
    const localEnvPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(localEnvPath)) {
      const localEnvContent = fs.readFileSync(localEnvPath, 'utf8');
      const dbUrlMatch = localEnvContent.match(/DATABASE_URL=(.+)/);
      if (dbUrlMatch && dbUrlMatch[1]) {
        databaseUrl = dbUrlMatch[1].trim();
        process.env.DATABASE_URL = databaseUrl;
        console.log('Successfully loaded DATABASE_URL from .env.local file');
      }
    }
  } catch (err) {
    console.error('Error reading .env.local file:', err);
  }
}

// If still not found, handle production vs development differently
if (!databaseUrl) {
  if (process.env.NODE_ENV === 'development') {
  databaseUrl = "postgresql://postgres:admin@localhost:5432/processsutra";
    process.env.DATABASE_URL = databaseUrl;
    console.warn("Using default DATABASE_URL for local development:", databaseUrl);
    console.warn("Please make sure PostgreSQL is installed and running.");
  } else {
    console.error("DATABASE_URL must be set in production. The server will start but database operations will fail.");
    console.error("Please set up a PostgreSQL database and configure the DATABASE_URL environment variable.");
    // Don't throw error, let server start for health checks
    databaseUrl = "postgresql://placeholder:placeholder@placeholder:5432/placeholder";
  }
}

console.log('Connecting to database...');

// Create a PostgreSQL pool with error handling
export const pool = new Pool({ 
  connectionString: databaseUrl,
  // Add connection timeout and retry logic
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

// Test the connection with better error handling
let dbConnected = false;

const testConnection = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Successfully connected to PostgreSQL database');
    dbConnected = true;
  } catch (err) {
    console.error('❌ Failed to connect to PostgreSQL database:', err);
    dbConnected = false;
    if (process.env.NODE_ENV === 'production') {
      console.error('🔧 Please check your DATABASE_URL environment variable in Railway');
    }
  }
};

// Test connection but don't block server startup
testConnection();

// Export connection status checker
export const isDatabaseConnected = () => dbConnected;

// Create a Drizzle ORM instance
export const db = drizzle(pool, { schema });