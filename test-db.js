// test-db.js - Simple script to test database connection
import pg from 'pg';
import fs from 'fs';
import path from 'path';

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  
  // Try to read DATABASE_URL from .env.local
  let databaseUrl;
  try {
    const localEnvPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(localEnvPath)) {
      const localEnvContent = fs.readFileSync(localEnvPath, 'utf8');
      const dbUrlMatch = localEnvContent.match(/DATABASE_URL=(.+)/);
      if (dbUrlMatch && dbUrlMatch[1]) {
        databaseUrl = dbUrlMatch[1].trim();
        console.log('Found DATABASE_URL in .env.local:', databaseUrl);
      }
    }
  } catch (err) {
    console.error('Error reading .env.local file:', err);
  }
  
  // If not found in .env.local, try .env
  if (!databaseUrl) {
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
        if (dbUrlMatch && dbUrlMatch[1]) {
          databaseUrl = dbUrlMatch[1].trim();
          console.log('Found DATABASE_URL in .env:', databaseUrl);
        }
      }
    } catch (err) {
      console.error('Error reading .env file:', err);
    }
  }
  
  // If still not found, use a default
  if (!databaseUrl) {
    databaseUrl = 'postgresql://postgres:admin@localhost:5432/flowsense';
    console.log('Using default DATABASE_URL:', databaseUrl);
  }
  
  // Parse the connection string
  const match = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) {
    console.error('Invalid DATABASE_URL format');
    return;
  }
  
  const [, user, password, host, port, database] = match;
  
  // Test the connection using pg
  try {
    const client = new pg.Client({
      user,
      password,
      host,
      port: parseInt(port, 10),
      database
    });
    
    await client.connect();
    
    console.log('Successfully connected to the database!');
    
    // Test a simple query
    const result = await client.query('SELECT current_database() as db_name');
    console.log('Current database:', result.rows[0].db_name);
    
    // Close the connection
    await client.end();
    
    console.log('Database connection test completed successfully.');
  } catch (error) {
    console.error('Failed to connect to the database:', error);
  }
}

testDatabaseConnection();