import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
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