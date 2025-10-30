import { createSignal, createResource, Show, createEffect } from 'solid-js';
import { useAuth } from '~/lib/auth-context';
import { useTheme } from '~/lib/theme-context';
import { UserSettings as UserSettingsType, UpdateUserSettingsData } from '~/lib/user-settings-service';
import { SkeletonPageHeader } from './Skeletons';

interface UserSettingsProps {
  onSave?: (settings: UserSettingsType) => void;
  onError?: (error: string) => void;
}

export default function UserSettings(props: UserSettingsProps) {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = createSignal(false);
  const [message, setMessage] = createSignal<{ type: 'success' | 'error'; text: string } | null>(null);
  const [localTheme, setLocalTheme] = createSignal<'light' | 'dark' | 'system'>('system');

  // Load settings
  const [settings] = createResource(
    () => user()?.id,
    async (userId) => {
      if (!userId) return null;
      
      try {
        const response = await fetch('/api/settings');
        if (!response.ok) {
          throw new Error('Failed to load settings');
        }
        const data = await response.json();
        return data.settings as UserSettingsType;
      } catch (error) {
        console.error('Error loading settings:', error);
        return null;
      }
    }
  );

  // Update local form state when settings load
  createEffect(() => {
    const settingsData = settings();
    if (settingsData) {
      setLocalTheme(settingsData.theme);
    }
  });
  
  // Keep local theme in sync with global theme
  createEffect(() => {
    setLocalTheme(theme());
  });

  const handleSave = async (e: Event) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const newTheme = localTheme();
      const updates: UpdateUserSettingsData = {
        theme: newTheme,
      };

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      const data = await response.json();
      
      // Update the global theme context to reflect the saved setting
      await setTheme(data.settings.theme);
      
      setMessage({ type: 'success', text: 'Theme preference saved successfully!' });
      props.onSave?.(data.settings);

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings';
      setMessage({ type: 'error', text: errorMessage });
      props.onError?.(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="max-w-4xl mx-auto">
      <Show when={settings.loading}>
        <SkeletonPageHeader />
      </Show>

      <Show when={!settings.loading && settings()}>
        <form onSubmit={handleSave} class="space-y-8">
          {/* Success/Error Messages */}
          <Show when={message()}>
            <div class={`p-4 rounded-lg ${message()?.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'}`}>
              {message()?.text}
            </div>
          </Show>

          {/* Theme Settings */}
          <div class="bg-white dark:bg-stone-800 rounded-lg shadow-sm border border-gray-200 dark:border-stone-700 p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-stone-100 mb-4">Theme Preferences</h3>
            
            <div class="space-y-4">
              <div>
                <label for="theme" class="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
                  Choose your preferred theme
                </label>
                <select
                  id="theme"
                  value={localTheme()}
                  onChange={(e) => {
                    const newTheme = e.currentTarget.value as 'light' | 'dark' | 'system';
                    setLocalTheme(newTheme); // Update local state, will save on form submit
                  }}
                  class="w-full px-3 py-2 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100"
                >
                  <option value="light">Light Mode</option>
                  <option value="dark">Dark Mode</option>
                  <option value="system">System Default</option>
                </select>
              </div>
              
              <div class="text-sm text-gray-600 dark:text-stone-400">
                <p class="mb-2"><strong>Light Mode:</strong> Traditional light interface</p>
                <p class="mb-2"><strong>Dark Mode:</strong> Dark interface that's easier on the eyes</p>
                <p class="mb-2"><strong>System Default:</strong> Automatically matches your device's theme setting</p>
                <div class="mt-3 p-3 bg-gray-50 dark:bg-stone-700 rounded-lg">
                  <p class="text-xs font-medium text-gray-700 dark:text-stone-300">
                    Currently selected: <span class="capitalize">{localTheme()}</span>
                    {localTheme() !== theme() && (
                      <span class="text-orange-600 dark:text-orange-400 ml-2">
                        (Click "Save" to apply changes)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div class="flex justify-end pt-6 border-t border-gray-200 dark:border-stone-700">
            <button
              type="submit"
              disabled={saving()}
              class="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <Show when={saving()}>
                <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              </Show>
              {saving() ? 'Saving...' : 'Save Theme Preference'}
            </button>
          </div>
        </form>
      </Show>

      <Show when={!settings.loading && !settings()}>
        <div class="text-center py-8">
          <p class="text-gray-500">Failed to load settings. Please try refreshing the page.</p>
        </div>
      </Show>
    </div>
  );
}