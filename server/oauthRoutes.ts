import { Router } from 'express';
import { getAuthorizationUrl, getTokensFromCode, verifyIdToken } from './services/googleOAuth';
import { isAuthenticated } from './firebaseAuth';
import { storage } from './storage';

export const oauthRouter = Router();

// Initiate Google Drive OAuth flow
oauthRouter.get('/google/authorize', isAuthenticated, async (req: any, res) => {
  try {
    const sessionUser = req.session?.user;
    if (!sessionUser?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Generate state with user ID for verification
    const state = Buffer.from(JSON.stringify({ userId: sessionUser.id })).toString('base64');
    const authUrl = getAuthorizationUrl(state, true); // true = Drive flow

    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ message: 'Failed to generate authorization URL' });
  }
});

// Handle OAuth callback
oauthRouter.get('/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error('OAuth error from Google:', error);
      return res.redirect(`/profile?error=${encodeURIComponent(error as string)}`);
    }

    if (!code || !state) {
      return res.redirect('/profile?error=missing_parameters');
    }

    // Verify state and extract user ID
    let userId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      userId = stateData.userId;
    } catch (e) {
      console.error('Failed to decode OAuth state:', e);
      return res.redirect('/profile?error=invalid_state');
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code as string);

    if (!tokens.access_token) {
      console.error('No access token received from Google');
      return res.redirect('/profile?error=no_access_token');
    }

    // Verify the ID token to get user info
    let userInfo;
    if (tokens.id_token) {
      userInfo = await verifyIdToken(tokens.id_token);
    }

    // Update user with OAuth tokens
    await storage.updateUser(userId, {
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token || undefined,
      googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      googleDriveEnabled: true,
    } as any);

    // Redirect back to profile with success
    res.redirect('/profile?drive_connected=true');
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    res.redirect('/profile?error=authorization_failed');
  }
});

// Disconnect Google Drive
oauthRouter.post('/google/disconnect', isAuthenticated, async (req: any, res) => {
  try {
    const sessionUser = req.session?.user;
    if (!sessionUser?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Clear OAuth tokens
    await storage.updateUser(sessionUser.id, {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
      googleDriveEnabled: false,
    } as any);

    res.json({ success: true, message: 'Google Drive disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting Drive:', error);
    res.status(500).json({ message: 'Failed to disconnect Google Drive' });
  }
});

// Check Drive connection status
oauthRouter.get('/google/status', isAuthenticated, async (req: any, res) => {
  try {
    const sessionUser = req.session?.user;
    if (!sessionUser?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const dbUser = await storage.getUser(sessionUser.id);
    if (!dbUser) {
      return res.status(401).json({ message: 'User not found' });
    }

    res.json({
      connected: dbUser.googleDriveEnabled || false,
      hasToken: !!dbUser.googleAccessToken,
      tokenExpiry: dbUser.googleTokenExpiry,
    });
  } catch (error) {
    console.error('Error checking Drive status:', error);
    res.status(500).json({ message: 'Failed to check Drive status' });
  }
});

export default oauthRouter;
