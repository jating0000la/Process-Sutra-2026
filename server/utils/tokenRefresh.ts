import type { OAuth2Client } from 'google-auth-library';
import { getOAuth2Client } from '../services/googleOAuth';
import { storage } from '../storage';

/**
 * Token refresh lock to prevent race conditions
 * Key: userId, Value: Promise of refresh operation
 */
const tokenRefreshLocks = new Map<string, Promise<any>>();

/**
 * Ensure user has a valid Google OAuth token with race condition protection
 * Automatically refreshes expired tokens and updates database
 * 
 * @param userId - The user ID to check/refresh token for
 * @returns User object with fresh tokens, or null if user not found
 */
export async function ensureValidToken(userId: string) {
  // Check if refresh already in progress for this user
  let refreshPromise = tokenRefreshLocks.get(userId);
  
  if (refreshPromise) {
    // Wait for ongoing refresh and return fresh user data
    await refreshPromise;
    return await storage.getUser(userId);
  }
  
  let dbUser = await storage.getUser(userId);
  if (!dbUser) return null;
  
  // Check if token is expired
  if (dbUser.googleTokenExpiry && new Date() >= dbUser.googleTokenExpiry) {
    // Create a refresh promise to prevent concurrent refreshes
    refreshPromise = (async () => {
      try {
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({
          access_token: dbUser.googleAccessToken,
          refresh_token: dbUser.googleRefreshToken,
          expiry_date: dbUser.googleTokenExpiry?.getTime(),
        });
        
        // Refresh the token
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        // Update database with new tokens
        await storage.updateUser(dbUser.id, {
          googleAccessToken: credentials.access_token!,
          googleRefreshToken: credentials.refresh_token || dbUser.googleRefreshToken,
          googleTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
        } as any);
      } catch (error) {
        console.error(`Token refresh failed for user ${dbUser.email}:`, error);
        throw error;
      } finally {
        // Always remove lock when done
        tokenRefreshLocks.delete(userId);
      }
    })();
    
    tokenRefreshLocks.set(userId, refreshPromise);
    await refreshPromise;
    
    // Return fresh user data after refresh
    return await storage.getUser(userId);
  }
  
  return dbUser;
}

/**
 * Refresh token for a user object (used in loops/aggregations)
 * Mutates the oauth2Client credentials in place
 * 
 * @param user - User object with OAuth tokens
 * @param oauth2Client - OAuth2 client to update with fresh credentials
 * @returns true if token was valid/refreshed, false if refresh failed
 */
export async function refreshTokenIfNeeded(user: any, oauth2Client: OAuth2Client): Promise<boolean> {
  try {
    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
      expiry_date: user.googleTokenExpiry?.getTime(),
    });
    
    // Check if token is expired
    if (user.googleTokenExpiry && new Date() >= user.googleTokenExpiry) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      
      // Update user's tokens in database
      await storage.updateUser(user.id, {
        googleAccessToken: credentials.access_token!,
        googleRefreshToken: credentials.refresh_token || user.googleRefreshToken,
        googleTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
      } as any);
    }
    
    return true;
  } catch (error) {
    console.error(`Token refresh failed for user ${user.email}:`, error);
    return false;
  }
}

/**
 * Check if a token is expired or will expire soon (within 5 minutes)
 * 
 * @param tokenExpiry - Token expiry date
 * @param bufferMinutes - Buffer time in minutes (default: 5)
 * @returns true if token is expired or will expire soon
 */
export function isTokenExpired(tokenExpiry: Date | null | undefined, bufferMinutes: number = 5): boolean {
  if (!tokenExpiry) return false;
  
  const now = new Date();
  const expiryWithBuffer = new Date(tokenExpiry.getTime() - bufferMinutes * 60 * 1000);
  
  return now >= expiryWithBuffer;
}

/**
 * Clear all token refresh locks (useful for testing)
 */
export function clearTokenRefreshLocks() {
  tokenRefreshLocks.clear();
}
