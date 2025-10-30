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
  
  console.log('ThemeProvider initialized');

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
    
    console.log('🎨 resolvedTheme called:', {
      currentTheme,
      systemTheme,
      willUseSystem: currentTheme === 'system',
      finalTheme: currentTheme === 'system' ? systemTheme : currentTheme
    });
    
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
        console.log('✅ Theme saved to user settings:', newTheme);
        return; // Success - no need to use localStorage
      } else {
        console.log('⚠️ Failed to save theme to user settings, using localStorage');
      }
    } catch (error) {
      console.log('⚠️ Could not save theme to user settings, using localStorage:', error);
    }
    
    // Fallback to localStorage if not authenticated or save failed
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
  };

  // Load user's theme setting from their settings
  const loadUserTheme = async () => {
    console.log('🎨 loadUserTheme called, hasLoadedUserSettings:', hasLoadedUserSettings());
    if (hasLoadedUserSettings()) return; // Prevent multiple loads
    
    let foundUserSetting = false;
    
    // Clear any localStorage theme since user settings should take precedence
    if (typeof window !== 'undefined') {
      const localTheme = localStorage.getItem('theme');
      if (localTheme) {
        console.log('🗑️ Clearing localStorage theme:', localTheme, 'to prioritize user settings');
        localStorage.removeItem('theme');
      }
    }
    
    // Try to load from user settings first (only works if authenticated)
    try {
      console.log('🔍 Attempting to fetch user settings...');
      const response = await fetch('/api/settings');
      console.log('🔍 Settings API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Settings API response data:', data);
        
        if (data.settings?.theme) {
            console.log('✅ Loading user theme from settings:', data.settings.theme);
            setThemeState(data.settings.theme);
            foundUserSetting = true;
        } else {
            console.log('⚠️ No theme found in user settings, using system default');
        }
      } else if (response.status === 401) {
        console.log('🔒 User not authenticated, will use system default');
      } else {
        console.log('❌ Settings fetch failed with status:', response.status);
      }
    } catch (error) {
      console.log('❌ Could not load user theme from settings:', error);
    }

    // If no user setting was found, use system default
    if (!foundUserSetting) {
      console.log('📱 Using system default theme');
      setThemeState('system');
    }
    
    setHasLoadedUserSettings(true);
    setIsInitializing(false);
    console.log('🎨 loadUserTheme completed, final theme:', theme());
    
    // Force immediate application of theme
    setTimeout(() => applyTheme(), 0);
  };

  // Apply theme to document
  const applyTheme = () => {
    if (typeof window === 'undefined') {
      console.log('🎨 applyTheme skipped - SSR');
      return;
    }

    // Don't apply theme until we've loaded user settings (prevents flash of wrong theme)
    if (isInitializing() && !hasLoadedUserSettings()) {
      console.log('🎨 applyTheme skipped - still initializing');
      return;
    }

    const root = document.documentElement;
    const currentTheme = theme();
    const resolved = resolvedTheme();
    
    console.log('🎨 applyTheme called:', {
      currentTheme,
      resolved,
      currentClassList: Array.from(root.classList),
      willAddDark: resolved === 'dark',
      systemTheme: getSystemTheme(),
      isInitializing: isInitializing()
    });
    
    setIsDark(resolved === 'dark');

    if (resolved === 'dark') {
      root.classList.add('dark');
      console.log('✅ Added dark class to <html>');
    } else {
      root.classList.remove('dark');
      console.log('✅ Removed dark class from <html>');
    }
    
    // Double-check what's actually on the element after our changes
    setTimeout(() => {
      console.log('🔍 Final check - HTML classes:', Array.from(root.classList));
      console.log('🔍 Has dark class?', root.classList.contains('dark'));
      console.log('🔍 Current theme state:', currentTheme);
      console.log('🔍 Resolved theme:', resolved);
    }, 100);
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
    console.log('🎨 ThemeProvider onMount');
    
    // Load theme immediately - no delay needed
    console.log('🎨 Loading initial theme...');
    loadUserTheme();
    
    // Listen for custom auth events (we'll dispatch these from auth context)
    const handleAuthChange = () => {
      console.log('🔄 Auth state changed, reloading theme...');
      setHasLoadedUserSettings(false); // Reset so we can reload
      setIsInitializing(true); // Reset initialization state
      // Small delay to ensure auth context has updated
      setTimeout(() => {
        console.log('🔄 Reloading theme after auth change...');
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
    console.log('🔄 createEffect triggered for applyTheme, current theme:', theme());
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