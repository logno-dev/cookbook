import { createContext, useContext, createSignal, createEffect, JSX } from 'solid-js';
import { api } from './api-client';

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
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes - increased for better performance

export function AuthProvider(props: { children: JSX.Element }) {
  const [user, setUser] = createSignal<User | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [hasCheckedAuth, setHasCheckedAuth] = createSignal(false);

  // Get cached auth status
  const getCachedAuth = (): User | null => {
    // Return null during SSR to prevent hydration mismatches
    if (typeof window === 'undefined') {
      return null;
    }
    
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
    // Skip caching during SSR
    if (typeof window === 'undefined') {
      return;
    }
    
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
      const data = await api.checkAuth();
      setUser(data.user);
      setCachedAuth(data.user);
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
    // Only run on client side to avoid SSR issues
    if (typeof window === 'undefined') {
      return;
    }
    
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
    const data = await api.login(email, password);
    setUser(data.user);
    setCachedAuth(data.user);
    
    // Ensure loading is false after successful login
    setLoading(false);
  };

  const register = async (email: string, password: string, name?: string) => {
    const data = await api.register(email, password, name);
    setUser(data.user);
    setCachedAuth(data.user);
  };

  const logout = async () => {
    await api.logout();
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
    const data = await api.checkAuth();
    return data.user;
  } catch (error) {
    console.error('Failed to check auth status:', error);
    return null;
  }
}