# Google Authentication & Session Troubleshooting Guide

## Issues Fixed

### 1. Session Configuration Problems
**Problem**: Sessions weren't persisting due to restrictive cookie settings
**Solution**: 
- Changed `cookieSecure` to `false` for development
- Updated `sameSite` from `'strict'` to `'lax'` for better OAuth compatibility
- Increased session TTL from 4 hours to 24 hours
- Added custom session name `processsutra.sid`
- Enabled session table creation for development

### 2. Cookie Security Settings
**Problem**: Cookies were too restrictive for local development
**Solution**:
- Set `INSECURE_COOKIES=true` in `.env` for development
- Updated `COOKIE_SAMESITE=lax` for OAuth compatibility
- Ensured cookies work on `127.0.0.1:5000`

### 3. Authentication Flow Issues
**Problem**: Users redirected to login page after successful authentication
**Solution**:
- Removed immediate redirect after login in AuthContext
- Let React state updates handle navigation naturally
- Added better error handling and logging
- Fixed session regeneration and saving

### 4. Debugging & Monitoring
**Added**:
- Enhanced AuthDebug component with session status
- Better logging throughout authentication flow
- Session status checking in debug component
- Cookie presence detection

## Testing Steps

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Check the debug panel** (bottom-right corner):
   - Should show "Loading: No" when ready
   - Should show "Session Status: 401" when not logged in
   - Should show cookie presence

3. **Test Google Login**:
   - Click "Sign in with Google"
   - Complete OAuth flow
   - Should see user email in debug panel
   - Should redirect to analytics page

4. **Verify Session Persistence**:
   - Refresh the page
   - Should remain logged in
   - Debug panel should show "Session Status: 200"

## Common Issues & Solutions

### Issue: "Session Status: 401" after login
**Cause**: Session not being saved properly
**Solution**: Check database connection and session table

### Issue: Cookies not being set
**Cause**: Secure cookie settings in development
**Solution**: Ensure `INSECURE_COOKIES=true` in `.env`

### Issue: Redirect loops
**Cause**: Authentication state not updating properly
**Solution**: Check AuthContext state management

### Issue: Google OAuth fails
**Cause**: Incorrect client configuration
**Solution**: Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

## Environment Variables Checklist

```bash
# Required for development
NODE_ENV=development
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
INSECURE_COOKIES=true

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:5000/api/auth/google/callback
VITE_GOOGLE_CLIENT_ID=your_client_id

# Database
DATABASE_URL=postgresql://postgres:admin@127.0.0.1:5432/processsutra
SESSION_SECRET=your_long_session_secret_here
```

## Database Requirements

Ensure the `sessions` table exists:
```sql
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
) WITH (OIDS=FALSE);

ALTER TABLE sessions ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);
```

## Testing Authentication Endpoints

Run the test script:
```bash
node test-auth.js
```

This will verify:
- Health endpoint works
- Auth endpoints respond correctly
- Google OAuth initiation works
- Session handling is functional

## Production Considerations

When deploying to production:
1. Set `NODE_ENV=production`
2. Set `COOKIE_SECURE=true`
3. Remove `INSECURE_COOKIES` variable
4. Use HTTPS for all OAuth redirects
5. Update `GOOGLE_REDIRECT_URI` to production domain

## Monitoring & Logs

Watch for these log messages:
- `🔐 User logged in via Google OAuth:` - Successful login
- `📝 Login log created:` - Login attempt recorded
- `⚠️ Development mode: Using insecure cookies` - Cookie settings
- `✅ Google OAuth configured successfully` - OAuth setup

## Debug Component Usage

The AuthDebug component shows:
- Loading state
- Current user information
- Session status
- Cookie presence
- Detailed session information

Use this to troubleshoot authentication issues in real-time.