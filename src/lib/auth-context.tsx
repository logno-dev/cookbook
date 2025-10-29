import { createContext, useContext, createSignal, createEffect, JSX } from 'solid-js';

export interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: () => User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: () => boolean;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>();

// Cache auth status in sessionStorage to prevent unnecessary API calls
const AUTH_CACHE_KEY = 'auth_status';
const AUTH_CACHE_EXPIRY_KEY = 'auth_status_expiry';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function AuthProvider(props: { children: JSX.Element }) {
  const [user, setUser] = createSignal<User | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [hasCheckedAuth, setHasCheckedAuth] = createSignal(false);

  // Get cached auth status
  const getCachedAuth = (): User | null => {
    try {
      const cached = sessionStorage.getItem(AUTH_CACHE_KEY);
      const expiry = sessionStorage.getItem(AUTH_CACHE_EXPIRY_KEY);
      
      if (cached && expiry && Date.now() < parseInt(expiry)) {
        return cached === 'null' ? null : JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Failed to read auth cache:', error);
    }
    return undefined; // undefined means we should check the server
  };

  // Cache auth status
  const setCachedAuth = (user: User | null) => {
    try {
      sessionStorage.setItem(AUTH_CACHE_KEY, user ? JSON.stringify(user) : 'null');
      sessionStorage.setItem(AUTH_CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION).toString());
    } catch (error) {
      console.warn('Failed to cache auth status:', error);
    }
  };

  // Clear auth cache
  const clearAuthCache = () => {
    try {
      sessionStorage.removeItem(AUTH_CACHE_KEY);
      sessionStorage.removeItem(AUTH_CACHE_EXPIRY_KEY);
    } catch (error) {
      console.warn('Failed to clear auth cache:', error);
    }
  };

  // Check auth status from server
  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setCachedAuth(data.user);
      } else {
        setUser(null);
        setCachedAuth(null);
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
      setUser(null);
      setCachedAuth(null);
    } finally {
      setLoading(false);
    }
  };

  // Force refresh auth status (used after login/logout)
  const refreshAuth = async () => {
    clearAuthCache();
    await checkAuthStatus();
  };

  // Initial auth check with caching
  createEffect(() => {
    if (!hasCheckedAuth()) {
      setHasCheckedAuth(true);
      
      // Try to get cached auth first
      const cachedAuth = getCachedAuth();
      
      if (cachedAuth !== undefined) {
        // We have cached data (either user or null)
        setUser(cachedAuth);
        setLoading(false);
      } else {
        // No cached data, check the server
        checkAuthStatus();
      }
    }
  });

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    setUser(data.user);
    setCachedAuth(data.user);
    
    // Ensure loading is false after successful login
    setLoading(false);
  };

  const register = async (email: string, password: string, name?: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    setUser(data.user);
    setCachedAuth(data.user);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    clearAuthCache();
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, refreshAuth }}>
      {props.children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Server-side auth helper for routes
export async function getAuthenticatedUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      const data = await response.json();
      return data.user;
    }
    return null;
  } catch (error) {
    console.error('Failed to check auth status:', error);
    return null;
  }
}