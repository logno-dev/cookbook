import { Title } from "@solidjs/meta";
import { Show, onMount } from "solid-js";
import { useAuth } from "~/lib/auth-context";
import { useNavigate } from "@solidjs/router";
import { useBreadcrumbs } from "~/lib/breadcrumb-context";
import PageLayout from "~/components/PageLayout";
import ProtectedRoute from "~/components/ProtectedRoute";
import UserSettings from "~/components/UserSettings";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const breadcrumbs = useBreadcrumbs();

  onMount(() => {
    breadcrumbs.setBreadcrumbs([
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Settings', href: '/settings' }
    ]);
  });

  const handleSettingsSaved = () => {
    // Could add a toast notification here if you have a toast system
    console.log('Settings saved successfully');
  };

  const handleSettingsError = (error: string) => {
    console.error('Settings error:', error);
  };

  return (
    <ProtectedRoute>
      <Title>Settings - Recipe Curator</Title>
      
      <PageLayout 
        title="Settings" 
        subtitle="Manage your account preferences and settings"
        maxWidth="4xl"
      >
        <Show when={!loading() && user()}>
          <UserSettings 
            onSave={handleSettingsSaved}
            onError={handleSettingsError}
          />
        </Show>
      </PageLayout>
    </ProtectedRoute>
  );
}