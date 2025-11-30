# Google OAuth Setup Guide for Drive Integration

## Prerequisites
- Google Cloud Platform account
- Access to Google Cloud Console

## Step-by-Step Setup

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: "ProcessSutra File Uploads"
4. Click "Create"

### 2. Enable Google Drive API
1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google Drive API"
3. Click on "Google Drive API"
4. Click "Enable"

### 3. Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" (or "Internal" if using Google Workspace)
3. Click "Create"

#### Fill in App Information:
- **App name:** ProcessSutra
- **User support email:** your-email@example.com
- **App logo:** (optional)
- **Application home page:** http://localhost:5000 (or your domain)
- **Authorized domains:** localhost (or your domain)
- **Developer contact information:** your-email@example.com

4. Click "Save and Continue"

#### Configure Scopes:
1. Click "Add or Remove Scopes"
2. Filter for these scopes:
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/drive.file`
3. Click "Update"
4. Click "Save and Continue"

#### Test Users (for External apps):
1. Add your test user emails
2. Click "Save and Continue"

5. Review summary and click "Back to Dashboard"

### 4. Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "ProcessSutra Web Client"

#### Authorized JavaScript origins:
```
http://localhost:5000
http://localhost:3000
https://yourdomain.com
```

#### Authorized redirect URIs:
```
http://localhost:5000/api/oauth/google/callback
https://yourdomain.com/api/oauth/google/callback
```

5. Click "Create"
6. Copy the **Client ID** and **Client Secret**

### 5. Configure Environment Variables

Add to your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/oauth/google/callback

# For production, use:
# GOOGLE_REDIRECT_URI=https://yourdomain.com/api/oauth/google/callback
```

### 6. Run Database Migration

```bash
# Apply the schema changes for OAuth tokens
npm run db:push

# Or run the migration SQL manually
psql your_database < migrations/add_google_oauth_tokens_to_users.sql
```

### 7. Test the Integration

1. Start your server: `npm run dev`
2. Navigate to Settings page
3. Click "Connect Google Drive"
4. Should redirect to Google OAuth consent screen
5. Grant permissions
6. Should redirect back with success message
7. Try uploading a file

## Common Issues & Solutions

### Issue: "Redirect URI Mismatch"
**Solution:** Ensure the redirect URI in your OAuth credentials exactly matches `GOOGLE_REDIRECT_URI` in `.env`

### Issue: "Access Blocked: This app's request is invalid"
**Solution:** 
- Verify OAuth consent screen is configured
- Check that all required scopes are added
- Ensure app is published (or user is added as test user)

### Issue: "Invalid Client"
**Solution:** Double-check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`

### Issue: Token Expired
**Solution:** The app automatically refreshes tokens. If issues persist, disconnect and reconnect Drive in Settings.

### Issue: Files not appearing in Drive
**Solution:** Check "ProcessSutra Files" folder in Google Drive. Files are stored in this folder by default.

## Production Checklist

- [ ] Create separate OAuth credentials for production
- [ ] Update redirect URI to production domain
- [ ] Configure OAuth consent screen for production
- [ ] Set `GOOGLE_REDIRECT_URI` to production URL
- [ ] Test OAuth flow on production
- [ ] Monitor token refresh logs
- [ ] Set up error alerting for OAuth failures

## Security Best Practices

1. **Never commit `.env` file** - Keep OAuth credentials secure
2. **Use different credentials** for dev/staging/production
3. **Rotate secrets regularly** - Update client secret periodically
4. **Monitor OAuth logs** - Watch for suspicious authorization patterns
5. **Limit token scope** - Only request `drive.file` scope (not full Drive access)
6. **Implement rate limiting** - Prevent OAuth abuse
7. **Store tokens encrypted** - Database should use encryption at rest

## API Rate Limits

Google Drive API has the following limits:
- **Queries per day:** 1,000,000,000
- **Queries per 100 seconds per user:** 1,000
- **Queries per 100 seconds:** 10,000

If you hit rate limits:
1. Implement exponential backoff
2. Cache file metadata
3. Use batch requests where possible
4. Consider upgrading to higher quota

## Support Resources

- [Google Drive API Documentation](https://developers.google.com/drive/api/v3/about-sdk)
- [OAuth 2.0 Overview](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [API Quotas](https://console.cloud.google.com/apis/api/drive.googleapis.com/quotas)

## Troubleshooting Commands

Check OAuth token status:
```bash
curl http://localhost:5000/api/oauth/google/status \
  -H "Cookie: connect.sid=your-session-cookie"
```

Test file upload:
```bash
curl http://localhost:5000/api/uploads \
  -F "file=@test.pdf" \
  -F "formId=test-form" \
  -F "fieldId=test-field" \
  -H "Cookie: connect.sid=your-session-cookie"
```

## Migration from GridFS

If you have existing GridFS files:
1. Old files remain accessible (backward compatible)
2. New uploads automatically go to Google Drive
3. Export functionality updated to exclude GridFS files
4. Consider migrating old files manually if needed

## Next Steps

1. ✅ Complete OAuth setup
2. ✅ Run database migration
3. ✅ Test file upload flow
4. Configure production credentials
5. Monitor usage and quotas
6. Set up error alerting
7. Document for end users
