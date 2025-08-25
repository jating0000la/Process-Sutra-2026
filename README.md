# FlowSense - Local Development Setup

This guide will help you set up and run FlowSense locally on your Windows machine.

## Prerequisites

1. **Node.js** - Make sure you have Node.js installed (v16 or higher)

2. **PostgreSQL** - You need PostgreSQL installed locally
   - **Option 1:** Use our helper script to install PostgreSQL:
     ```powershell
     # Open PowerShell as Administrator and run:
     Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
     .\install-postgres.ps1
     ```
   - **Option 2:** Install manually from https://www.postgresql.org/download/windows/
     - During installation:
       - Remember your PostgreSQL username and password
       - Keep the default port (5432)
       - **IMPORTANT:** Check the option to install all components
       - **IMPORTANT:** Check the option to add PostgreSQL bin directory to your PATH
       - Complete the installation process
     - After installation:
       - Restart your computer to ensure PATH changes take effect
       - Verify installation by opening a new PowerShell window and typing: `psql --version`

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Local Environment

Run the setup script to configure your local environment:

1. Make sure PostgreSQL is installed and running
   - If PostgreSQL is not installed, run the helper script first:
     ```powershell
     # Open PowerShell as Administrator and run:
     Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
     .\install-postgres.ps1
     ```
   - After installing PostgreSQL, restart your computer

2. Configure the database and environment:
   - Open PowerShell as Administrator (right-click on PowerShell and select "Run as Administrator")
   - Navigate to your project directory
   - Run the following command to allow script execution:
     ```powershell
     Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
     ```
   - Run the setup script:
     ```powershell
     .\setup.ps1
     ```
   - Follow the prompts to enter your PostgreSQL credentials

The setup script will:
- Check if PostgreSQL is installed and running
- Create a PostgreSQL database named "flowsense"
- Set up your environment variables in `.env.local`
- Run database migrations

If you encounter any issues, the script will provide detailed error messages to help you troubleshoot.

### 3. Start the Development Server

Double-click on `start-dev.bat` to start the development server.

Alternatively, you can run:

```bash
npm run dev
```

The application will be available at http://localhost:5000

## Database Management

To view and manage your database, you can use:

```bash
npm run db:studio
```

This will start Drizzle Studio, a web-based database management tool.

## Troubleshooting

### PostgreSQL Installation Issues

If the setup script reports that PostgreSQL is not installed or `psql` is not recognized:

1. Install PostgreSQL from the official website: https://www.postgresql.org/download/windows/
   - During installation, select the option to install all components
   - Make sure to check the box to add PostgreSQL bin directory to your PATH
   - Note your username (default is "postgres") and password

2. After installation:
   - Restart your computer to ensure PATH changes take effect
   - Open a new PowerShell window and verify installation by typing: `psql --version`

3. If `psql` is still not recognized after installation and restart:
   - Add the PostgreSQL bin directory to your PATH manually:
     1. Search for "Environment Variables" in Windows search
     2. Click "Edit the system environment variables"
     3. Click the "Environment Variables" button
     4. Under "System variables", find and select "Path", then click "Edit"
     5. Click "New" and add the PostgreSQL bin path (typically `C:\Program Files\PostgreSQL\[version]\bin`)
     6. Click "OK" on all dialogs
     7. Open a new PowerShell window and try `psql --version` again

### Database Connection Issues

If you encounter database connection issues:

1. Verify PostgreSQL service is running
   - Open Services (services.msc)
   - Look for the PostgreSQL service (usually named "postgresql-x64-XX")
   - Make sure its status is "Running"
   - If it's not running, right-click on it and select "Start"

2. Check your PostgreSQL credentials in `.env.local`
   - Make sure the username and password in the `DATABASE_URL` are correct
   - The default format is: `postgresql://username:password@localhost:5432/flowsense`

3. Make sure the database "flowsense" exists
   - Open PowerShell and run: `psql -U postgres -c "\l"` (enter your password when prompted)
   - Look for "flowsense" in the list of databases
   - If it doesn't exist, you can create it manually:
     ```
     psql -U postgres
     CREATE DATABASE flowsense;
     \q
     ```

4. Test the database connection directly:
   - Run: `psql -U postgres -d flowsense -c "SELECT 1;"`
   - If successful, you should see "1" as the output

### Database Migration Failures

If database migrations fail:

1. Check the error messages in the console for specific issues

2. Verify your DATABASE_URL in `.env.local` is correct
   - Make sure the format is: `postgresql://username:password@localhost:5432/flowsense`
   - Ensure there are no special characters in the password that might need escaping

3. Try running migrations manually with verbose output:
   ```
   $env:DATABASE_URL="postgresql://username:password@localhost:5432/flowsense"
   npm run db:push
   ```

4. Check if you have the necessary permissions in PostgreSQL:
   - The user specified in DATABASE_URL must have permission to create tables
   - You can grant all privileges to your user with:
     ```
     psql -U postgres
     GRANT ALL PRIVILEGES ON DATABASE flowsense TO your_username;
     \q
     ```

### Script Execution Policy Issues

If you encounter errors running PowerShell scripts:

1. Open PowerShell as Administrator

2. Set the execution policy for the current session:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
   ```

3. Then run the script:
   ```powershell
   .\setup.ps1
   ```

### Port Already in Use

If you see an error like "port 5000 is already in use" when starting the development server:

1. You can change the port by adding `PORT=3000` (or any other port) to your `.env.local` file

2. Find and close the application using port 5000:
   - Open PowerShell as Administrator and run:
     ```powershell
     netstat -ano | findstr :5000
     ```
   - Note the PID (Process ID) in the last column
   - Then run:
     ```powershell
     taskkill /PID [PID_NUMBER] /F
     ```
   - Replace [PID_NUMBER] with the actual PID from the previous command

3. Alternatively, you can restart your computer to free up all ports