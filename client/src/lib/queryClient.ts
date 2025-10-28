import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Global function to handle authentication errors
function handleAuthError() {
  console.log('🔐 Authentication error detected, redirecting to login...');
  
  // Show a user-friendly message if possible
  try {
    // Create a temporary toast element
    const toastContainer = document.createElement('div');
    toastContainer.className = 'fixed top-4 right-4 z-50 bg-red-500 text-white p-4 rounded-lg shadow-lg';
    toastContainer.innerHTML = `
      <div class="flex items-center space-x-2">
        <span>⏰</span>
        <span>Session expired. Redirecting to login...</span>
      </div>
    `;
    document.body.appendChild(toastContainer);
    
    // Remove toast after redirect
    setTimeout(() => {
      if (document.body.contains(toastContainer)) {
        document.body.removeChild(toastContainer);
      }
    }, 3000);
  } catch (e) {
    // Fallback if DOM manipulation fails
    console.log('Unable to show toast, proceeding with redirect');
  }
  
  // Clear any stored auth state
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    console.log('Unable to clear storage:', e);
  }
  
  // Force redirect to login page after a brief delay
  // Use replace instead of href to avoid back button issues
  setTimeout(() => {
    // Check if we're already on login-related pages to avoid redirect loops
    const currentPath = window.location.pathname;
    if (currentPath !== '/' && currentPath !== '/api/login') {
      window.location.replace('/');
    }
  }, 1000);
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle 401 errors globally
    if (res.status === 401) {
      handleAuthError();
      return; // Don't throw, just redirect
    }
    
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw" | "redirect";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        return null;
      } else if (unauthorizedBehavior === "redirect") {
        handleAuthError();
        return null; // This won't be reached due to redirect
      } else {
        // "throw" behavior - but also redirect for better UX
        handleAuthError();
        throw new Error('401: Unauthorized');
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "redirect" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
