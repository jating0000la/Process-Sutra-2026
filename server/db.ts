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

// If still not found, use a default for local development
if (!databaseUrl) {
  if (process.env.NODE_ENV === 'development') {
    databaseUrl = "postgresql://postgres:admin@localhost:5432/flowsense";
    process.env.DATABASE_URL = databaseUrl;
    console.warn("Using default DATABASE_URL for local development:", databaseUrl);
    console.warn("Please make sure PostgreSQL is installed and running.");
  } else {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
}

console.log('Connecting to database with URL:', databaseUrl);

// Create a PostgreSQL pool
export const pool = new Pool({ connectionString: databaseUrl });

// Test the connection
pool.query('SELECT 1').then(() => {
  console.log('Successfully connected to PostgreSQL database');
}).catch(err => {
  console.error('Failed to connect to PostgreSQL database:', err);
});

// Create a Drizzle ORM instance
export const db = drizzle(pool, { schema });