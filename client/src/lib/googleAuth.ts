// Google OAuth using Google Identity Services (gsi)
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          disableAutoSelect: () => void;
          revoke: (email: string, callback: () => void) => void;
        };
        oauth2: {
          initTokenClient: (config: any) => any;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Load Google Identity Services script
export const loadGoogleIdentityServices = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
};

// Initialize Google Sign-In
export const initializeGoogleSignIn = async (onSuccess: (response: any) => void) => {
  await loadGoogleIdentityServices();

  if (!window.google?.accounts) {
    throw new Error('Google Identity Services not loaded');
  }

  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google Client ID not configured');
  }

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: onSuccess,
    auto_select: false,
    cancel_on_tap_outside: true,
  });
};

// Trigger Google One Tap
export const promptGoogleOneTap = () => {
  if (window.google?.accounts) {
    window.google.accounts.id.prompt();
  }
};

// Sign in with Google (popup)
export const signInWithGoogle = async (): Promise<any> => {
  await loadGoogleIdentityServices();

  return new Promise((resolve, reject) => {
    if (!window.google?.accounts) {
      reject(new Error('Google Identity Services not loaded'));
      return;
    }

    if (!GOOGLE_CLIENT_ID) {
      reject(new Error('Google Client ID not configured'));
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'email profile openid',
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        resolve(response);
      },
    });

    client.requestAccessToken();
  });
};

// Render Google Sign-In button
export const renderGoogleButton = (parent: HTMLElement, options?: any) => {
  if (window.google?.accounts) {
    window.google.accounts.id.renderButton(parent, {
      theme: 'outline',
      size: 'large',
      width: parent.offsetWidth,
      ...options,
    });
  }
};

// Sign out
export const signOut = (email?: string) => {
  if (window.google?.accounts && email) {
    window.google.accounts.id.revoke(email, () => {
      console.log('User signed out from Google');
    });
  }
  window.google?.accounts.id.disableAutoSelect();
};

// Decode JWT token (for ID token)
export const decodeJWT = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
};
