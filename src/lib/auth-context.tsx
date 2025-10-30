import { createContext, useContext, createSignal, createEffect, JSX } from 'solid-js';
import { api } from './api-client';

export interface User {
  id: string;
  email: string;
  name?: string;
  isSuperAdmin?: boolean;
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
  
  // Aggressive timeout to prevent hanging - set loading to false after 1 second regardless
  setTimeout(() => {
    if (loading()) {
      console.warn('🚨 Emergency timeout: forcing loading to false after 1 second');
      setLoading(false);
    }
  }, 1000);

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

  // Dispatch auth state change event
  const dispatchAuthChange = () => {
    if (typeof window !== 'undefined') {
      console.log('🔄 Dispatching auth-state-changed event');
      window.dispatchEvent(new CustomEvent('auth-state-changed'));
    }
  };

  // Check auth status from server
  const checkAuthStatus = async () => {
    try {
      console.log('🔍 Making API call to /api/auth/me...');
      const data = await api.checkAuth();
      console.log('🔍 Auth context received user data:', {
        rawData: data,
        user: data.user,
        isSuperAdmin: data.user?.isSuperAdmin,
        type: typeof data.user?.isSuperAdmin,
        allUserKeys: data.user ? Object.keys(data.user) : 'no user'
      });
      setUser(data.user);
      setCachedAuth(data.user);
      dispatchAuthChange();
    } catch (error) {
      console.log('⚠️ Auth check failed (likely not logged in):', error.message);
      setUser(null);
      setCachedAuth(null);
      dispatchAuthChange();
    } finally {
      console.log('✅ Auth check complete, setting loading to false');
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
        console.log('📦 Using cached auth data:', cachedAuth);
        setUser(cachedAuth);
        setLoading(false);
      } else {
        // No cached data, assume user is not logged in and show login form quickly
        console.log('🚫 No cached auth, defaulting to not logged in');
        setUser(null);
        setLoading(false);
        
        // Check the server in the background without blocking the UI
        checkAuthStatus().catch(() => {
          // Ignore errors - user can try to login if they want
          console.log('Background auth check failed, but UI already showing');
        });
      }
    }
  });

  const login = async (email: string, password: string) => {
    console.log('🔍 Auth context login attempt:', { email, passwordLength: password.length });
    
    try {
      // Clear any existing user state first
      setUser(null);
      
      const data = await api.login(email, password);
      console.log('✅ Auth context login successful:', data);
      
      if (!data || !data.user) {
        throw new Error('Invalid response from login API');
      }
      
      setUser(data.user);
      setCachedAuth(data.user);
      dispatchAuthChange();
      
      // Ensure loading is false after successful login
      setLoading(false);
      
      return data;
    } catch (error) {
      console.error('❌ Auth context login failed:', error);
      setUser(null);
      setCachedAuth(null);
      throw error;
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    const data = await api.register(email, password, name);
    setUser(data.user);
    setCachedAuth(data.user);
    dispatchAuthChange();
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    clearAuthCache();
    dispatchAuthChange();
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