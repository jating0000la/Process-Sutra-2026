# Hostinger MySQL Configuration for Drizzle
# Update drizzle.config.ts for MySQL on Hostinger

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './shared/mysql-schema.ts',
  out: './migrations/mysql',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'processsutra_db',
    ssl: process.env.NODE_ENV === 'production' ? {} : undefined,
  },
  verbose: true,
  strict: true,
});

# For Hostinger hosting, the typical MySQL credentials will be:
# MYSQL_HOST=localhost (or your Hostinger MySQL host)
# MYSQL_PORT=3306
# MYSQL_USER=your_hostinger_mysql_username
# MYSQL_PASSWORD=your_hostinger_mysql_password
# MYSQL_DATABASE=your_hostinger_database_name