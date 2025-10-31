import { createContext, useContext, createSignal, createEffect, onMount, JSX } from 'solid-js';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: () => Theme;
  setTheme: (theme: Theme) => Promise<void>;
  isDark: () => boolean;
  resolvedTheme: () => 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType>();

interface ThemeProviderProps {
  children: JSX.Element;
}

export function ThemeProvider(props: ThemeProviderProps) {
  const [theme, setThemeState] = createSignal<Theme>('system');
  const [isDark, setIsDark] = createSignal(false);
  const [hasLoadedUserSettings, setHasLoadedUserSettings] = createSignal(false);
  const [isInitializing, setIsInitializing] = createSignal(true);
  


  // Check system preference
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  // Get resolved theme (what theme is actually being used)
  const resolvedTheme = () => {
    const currentTheme = theme();
    const systemTheme = getSystemTheme();
    

    
    if (currentTheme === 'system') {
      return systemTheme;
    }
    return currentTheme as 'light' | 'dark';
  };

  // Set theme and persist to user settings or localStorage
  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    
    // Try to save to user settings first (if authenticated)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ theme: newTheme }),
      });
      
      if (response.ok) {

        return; // Success - no need to use localStorage
      } else {

      }
    } catch (error) {

    }
    
    // Fallback to localStorage if not authenticated or save failed
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
  };

  // Load user's theme setting from their settings
  const loadUserTheme = async () => {

    if (hasLoadedUserSettings()) return; // Prevent multiple loads
    
    let foundUserSetting = false;
    
    // Clear any localStorage theme since user settings should take precedence
    if (typeof window !== 'undefined') {
      const localTheme = localStorage.getItem('theme');
      if (localTheme) {

        localStorage.removeItem('theme');
      }
    }
    
    // Try to load from user settings first (only works if authenticated)
    try {
      const response = await fetch('/api/settings');
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.settings?.theme) {
            setThemeState(data.settings.theme);
            foundUserSetting = true;
        }
      }
    } catch (error) {

    }

    // If no user setting was found, use system default
    if (!foundUserSetting) {
      setThemeState('system');
    }
    
    setHasLoadedUserSettings(true);
    setIsInitializing(false);
    
    // Force immediate application of theme
    setTimeout(() => applyTheme(), 0);
  };

  // Apply theme to document
  const applyTheme = () => {
    if (typeof window === 'undefined') {
      return;
    }

    // Don't apply theme until we've loaded user settings (prevents flash of wrong theme)
    if (isInitializing() && !hasLoadedUserSettings()) {
      return;
    }

    const root = document.documentElement;
    const currentTheme = theme();
    const resolved = resolvedTheme();
    

    
    setIsDark(resolved === 'dark');

    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    

  };

  // Listen for system theme changes
  const listenForSystemThemeChanges = () => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme() === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addListener?.(handleChange) || mediaQuery.addEventListener?.('change', handleChange);

    // Cleanup function
    return () => {
      mediaQuery.removeListener?.(handleChange) || mediaQuery.removeEventListener?.('change', handleChange);
    };
  };

  // Initialize theme on mount and listen for auth changes
  onMount(() => {
    // Load theme immediately - no delay needed
    loadUserTheme();
    
    // Listen for custom auth events (we'll dispatch these from auth context)
    const handleAuthChange = () => {
      setHasLoadedUserSettings(false); // Reset so we can reload
      setIsInitializing(true); // Reset initialization state
      // Small delay to ensure auth context has updated
      setTimeout(() => {
        loadUserTheme();
      }, 100);
    };
    
    window.addEventListener('auth-state-changed', handleAuthChange);
    
    const cleanup = listenForSystemThemeChanges();
    
    return () => {
      window.removeEventListener('auth-state-changed', handleAuthChange);
      cleanup?.();
    };
  });

  // Apply theme whenever it changes
  createEffect(() => {
    applyTheme();
  });

  const value: ThemeContextType = {
    theme,
    setTheme,
    isDark,
    resolvedTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {props.children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}