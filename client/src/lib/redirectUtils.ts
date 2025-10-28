/**
 * Utility function to replace manual /api/login redirects with proper authentication handling
 * This should be used instead of window.location.href = "/api/login"
 */

export const redirectToLogin = () => {
  console.log('🔐 Redirecting to login page...');
  
  // Clear any stored auth state
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    console.log('Unable to clear storage:', e);
  }

  // Avoid redirect loops by checking current path
  const currentPath = window.location.pathname;
  if (currentPath !== '/' && currentPath !== '/api/login') {
    window.location.replace('/');
  }
};

/**
 * Check if the current URL is a login-related page
 */
export const isLoginPage = () => {
  const currentPath = window.location.pathname;
  return currentPath === '/' || currentPath === '/api/login' || currentPath.includes('login');
};