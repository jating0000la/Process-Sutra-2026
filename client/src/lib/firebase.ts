import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Debug: Log config (remove in production)

// Validate all required fields are present
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
  console.error('❌ Firebase configuration is incomplete! Missing required fields.');
  console.error('Environment variables check:', {
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY ? 'Found' : 'NOT FOUND',
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? 'Found' : 'NOT FOUND',
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID ? 'Found' : 'NOT FOUND',
    VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID ? 'Found' : 'NOT FOUND',
  });
}

let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Sign in with Google - try popup first, fallback to redirect
export const signInWithGoogle = async () => {
  try {
    console.log('🔑 Attempting popup sign-in...');
    const result = await signInWithPopup(auth, googleProvider);
    console.log('✅ Popup sign-in successful:', result.user.email);
    return result;
  } catch (error: any) {
    console.log('❌ Popup failed, trying redirect...', error.message);
    // Fallback to redirect if popup fails
    return signInWithRedirect(auth, googleProvider);
  }
};

// Handle redirect result
export const handleRedirectResult = () => {
  return getRedirectResult(auth);
};

// Sign out
export const logOut = () => {
  return signOut(auth);
};

// Auth state observer
export const onAuthStateChange = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback);
};