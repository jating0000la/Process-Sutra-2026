// load-env.js - Helper script to load environment variables from .env files
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env and .env.local if it exists
const loadEnv = () => {
  try {
    // First load the default .env file
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const env = config({ path: envPath });
      expand(env);
      console.log('Loaded environment variables from .env');
    }
    
    // Then try to load .env.local which overrides .env
    const localEnvPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(localEnvPath)) {
      const localEnv = config({ path: localEnvPath, override: true });
      expand(localEnv);
      console.log('Loaded environment variables from .env.local');
    }
    
    // Manually set DATABASE_URL if it's not set but exists in .env.local
    if (!process.env.DATABASE_URL) {
      try {
        const localEnvContent = fs.existsSync(localEnvPath) ? 
          fs.readFileSync(localEnvPath, 'utf8') : '';
        
        const dbUrlMatch = localEnvContent.match(/DATABASE_URL=(.+)/);
        if (dbUrlMatch && dbUrlMatch[1]) {
          process.env.DATABASE_URL = dbUrlMatch[1].trim();
          console.log('Manually set DATABASE_URL from .env.local');
        }
      } catch (err) {
        console.error('Error reading .env.local file:', err);
      }
    }
    
    // Log environment variables for debugging
    console.log('Environment variables loaded. DATABASE_URL is', 
      process.env.DATABASE_URL ? 'set' : 'NOT SET');
    
    if (!process.env.DATABASE_URL) {
      console.error('WARNING: DATABASE_URL is not set. Database operations will fail.');
      console.error('Please make sure PostgreSQL is installed and .env.local contains the correct DATABASE_URL.');
    }
  } catch (error) {
    console.error('Error loading environment variables:', error);
  }
};

export default loadEnv;