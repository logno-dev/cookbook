import { Title } from "@solidjs/meta";
import { useTheme } from "~/lib/theme-context";
import { useAuth } from "~/lib/auth-context";
import { createSignal, onMount } from "solid-js";
import PageLayout from "~/components/PageLayout";

export default function ThemeDebug() {
  const { theme, isDark, resolvedTheme, setTheme } = useTheme();
  const { user } = useAuth();
  const [htmlClasses, setHtmlClasses] = createSignal<string[]>([]);
  const [systemTheme, setSystemTheme] = createSignal<string>('');
  
  const forceReloadTheme = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        console.log('Force reload - got settings:', data);
        if (data.settings?.theme) {
          console.log('Force setting theme to:', data.settings.theme);
          await setTheme(data.settings.theme);
        }
      }
    } catch (error) {
      console.error('Failed to force reload theme:', error);
    }
  };
  
  const clearAllCache = () => {
    // Clear localStorage
    localStorage.removeItem('theme');
    localStorage.removeItem('auth_status');
    localStorage.removeItem('auth_status_expiry');
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    console.log('Cleared all cached data');
    
    // Reload page
    window.location.reload();
  };

  onMount(() => {
    // Check HTML classes
    const updateInfo = () => {
      if (typeof window !== 'undefined') {
        setHtmlClasses(Array.from(document.documentElement.classList));
        setSystemTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      }
    };
    
    updateInfo();
    const interval = setInterval(updateInfo, 1000);
    
    return () => clearInterval(interval);
  });

  return (
    <PageLayout>
      <Title>Theme Debug - Recipe Cookbook</Title>
      
      <div class="container mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-stone-100 mb-8">Theme Debug Info</h1>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Theme Context Info */}
          <div class="bg-white dark:bg-stone-800 rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-stone-100 mb-4">Theme Context</h2>
            <div class="space-y-2 text-sm">
              <p><strong>Current Theme:</strong> {theme()}</p>
              <p><strong>Resolved Theme:</strong> {resolvedTheme()}</p>
              <p><strong>Is Dark:</strong> {isDark() ? 'Yes' : 'No'}</p>
              <p><strong>System Theme:</strong> {systemTheme()}</p>
            </div>
          </div>

          {/* User Info */}
          <div class="bg-white dark:bg-stone-800 rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-stone-100 mb-4">User Context</h2>
            <div class="space-y-2 text-sm">
              <p><strong>User:</strong> {user()?.email || 'Not logged in'}</p>
              <p><strong>Name:</strong> {user()?.name || 'N/A'}</p>
              <p><strong>Super Admin:</strong> {user()?.isSuperAdmin ? 'Yes' : 'No'}</p>
              <p><strong>User ID:</strong> {user()?.id || 'N/A'}</p>
              <p><strong>Auth Loading:</strong> {authLoading() ? 'Yes' : 'No'}</p>
            </div>
            <div class="mt-4">
              <button 
                onClick={() => console.log('Current auth state:', { user: user(), loading: authLoading() })}
                class="px-3 py-1 bg-blue-600 text-white rounded text-sm"
              >
                Log Auth State
              </button>
            </div>
          </div>

          {/* Session Info */}
          <div class="bg-white dark:bg-stone-800 rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-stone-100 mb-4">Session Info</h2>
            <div class="space-y-2 text-sm">
              <p><strong>HTML Classes:</strong> {htmlClasses().join(', ') || 'None'}</p>
              <p><strong>Has Dark Class:</strong> {htmlClasses().includes('dark') ? 'Yes' : 'No'}</p>
              <p><strong>Session Cookie:</strong> {document.cookie.includes('session') ? 'Present' : 'Missing'}</p>
            </div>
            <div class="mt-4">
              <button 
                onClick={() => console.log('All cookies:', document.cookie)}
                class="px-3 py-1 bg-green-600 text-white rounded text-sm"
              >
                Log Cookies
              </button>
            </div>
          </div>

          {/* Actions */}
          <div class="bg-white dark:bg-stone-800 rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-stone-100 mb-4">Debug Actions</h2>
            <div class="space-y-2">
              <button 
                onClick={() => console.log('Theme Debug Info:', { theme: theme(), resolved: resolvedTheme(), isDark: isDark(), htmlClasses: htmlClasses() })}
                class="block w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Log to Console
              </button>
              <button 
                onClick={() => {
                  document.documentElement.classList.remove('dark');
                  console.log('Manually removed dark class');
                }}
                class="block w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Force Remove Dark Class
              </button>
              <button 
                onClick={() => {
                  document.documentElement.classList.add('dark');
                  console.log('Manually added dark class');
                }}
                class="block w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Force Add Dark Class
              </button>
              <button 
                onClick={forceReloadTheme}
                class="block w-full px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
              >
                Force Reload Theme from Settings
              </button>
              <button 
                onClick={clearAllCache}
                class="block w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Clear All Cache & Reload
              </button>
              <button 
                onClick={() => {
                  const html = document.documentElement;
                  if (html.classList.contains('dark')) {
                    html.classList.remove('dark');
                    console.log('Manually removed dark class for Tailwind test');
                  } else {
                    html.classList.add('dark');
                    console.log('Manually added dark class for Tailwind test');
                  }
                }}
                class="block w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Toggle Dark Class (Test Tailwind)
              </button>
            </div>
          </div>
        </div>
        
        {/* Tailwind Test Elements */}
        <div class="mt-8">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-stone-100 mb-4">Tailwind Dark Mode Test</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-white dark:bg-stone-800 text-gray-900 dark:text-stone-100 p-4 rounded border dark:border-stone-700">
              <h3 class="font-bold mb-2">Expected Behavior:</h3>
              <p class="mb-2"><strong>Light mode:</strong> White background, dark text</p>
              <p><strong>Dark mode:</strong> Dark background, light text</p>
            </div>
            <div class="bg-gray-100 dark:bg-stone-900 text-gray-800 dark:text-stone-200 p-4 rounded border dark:border-stone-600">
              <h3 class="font-bold mb-2">Current Colors:</h3>
              <p class="mb-1">Background: <span class="bg-red-200 dark:bg-red-800 px-2 py-1 rounded">Should change</span></p>
              <p>Text: <span class="text-blue-600 dark:text-blue-400 font-semibold">Should change</span></p>
            </div>
          </div>
          
          {/* Direct Tailwind Test */}
          <div class="mt-6 p-4 border-2 border-dashed border-gray-400 dark:border-stone-500">
            <h3 class="font-bold text-gray-900 dark:text-stone-100 mb-3">Direct CSS Test</h3>
            <div class="space-y-2">
              <div class="p-3 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded">
                Blue: Light mode = light blue bg, dark blue text | Dark mode = dark blue bg, light blue text
              </div>
              <div class="p-3 bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 rounded">
                Green: Light mode = light green bg, dark green text | Dark mode = dark green bg, light green text
              </div>
              <div class="p-3 bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 rounded">
                Red: Light mode = light red bg, dark red text | Dark mode = dark red bg, light red text
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}