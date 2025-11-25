import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'];

// Initialize OAuth2 client
export function getOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth credentials are not configured in environment variables');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// Generate authorization URL
export function getAuthorizationUrl(state?: string): string {
  const oauth2Client = getOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: state || '',
  });
}

// Exchange authorization code for tokens
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
}

// Verify ID token and extract user info
export async function verifyIdToken(idToken: string) {
  const oauth2Client = getOAuth2Client();
  
  const ticket = await oauth2Client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  
  const payload = ticket.getPayload();
  
  if (!payload) {
    throw new Error('Invalid token payload');
  }

  return {
    uid: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified,
    displayName: payload.name,
    photoURL: payload.picture,
  };
}

// Get user info from access token
export async function getUserInfo(accessToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  
  return {
    uid: data.id,
    email: data.email,
    emailVerified: data.verified_email,
    displayName: data.name,
    photoURL: data.picture,
  };
}

// Verify access token validity
export async function verifyAccessToken(accessToken: string) {
  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const tokenInfo = await oauth2Client.getTokenInfo(accessToken);
    return tokenInfo;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}
