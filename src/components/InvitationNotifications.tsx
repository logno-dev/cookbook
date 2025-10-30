import { createSignal, createResource, Show, For } from "solid-js";
import { useAuth } from "~/lib/auth-context";
import { useToast } from "~/lib/notifications";

interface CookbookInvitation {
  id: string;
  cookbookId: string;
  inviterUserId: string;
  inviteeEmail: string;
  inviteeUserId?: string;
  role: 'editor' | 'contributor' | 'reader';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  message?: string;
  createdAt: string;
  expiresAt?: string;
  cookbook: {
    id: string;
    title: string;
    description?: string;
  };
  inviter: {
    id: string;
    email: string;
    name?: string;
  };
}

async function fetchInvitations(): Promise<CookbookInvitation[]> {
  const response = await fetch('/api/invitations');
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch invitations (${response.status}): ${errorText}`);
  }
  const data = await response.json();
  return data.invitations || [];
}

async function respondToInvitation(invitationId: string, response: 'accepted' | 'declined'): Promise<void> {
  const apiResponse = await fetch(`/api/invitations/${invitationId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ response }),
  });
  
  if (!apiResponse.ok) {
    const error = await apiResponse.json();
    throw new Error(error.error || 'Failed to respond to invitation');
  }
}

export default function InvitationNotifications() {
  const { user } = useAuth();
  const toast = useToast();
  const [showInvitations, setShowInvitations] = createSignal(false);
  const [isResponding, setIsResponding] = createSignal<string | null>(null);

  if (!user()) return null;

  const [invitations, { refetch }] = createResource(
    () => user(), // Only fetch when user is available
    async (userData) => {
      if (!userData) return [];
      return fetchInvitations();
    }
  );

  const handleInvitationResponse = async (invitationId: string, response: 'accepted' | 'declined') => {
    setIsResponding(invitationId);
    try {
      await respondToInvitation(invitationId, response);
      refetch();
      if (response === 'accepted') {
        // Optionally redirect to the cookbook
        setTimeout(() => {
          const invitation = invitations()?.find(inv => inv.id === invitationId);
          if (invitation) {
            window.location.href = `/cookbooks/${invitation.cookbookId}`;
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to respond to invitation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to respond to invitation');
    } finally {
      setIsResponding(null);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'editor': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'contributor': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'reader': return 'bg-gray-100 dark:bg-stone-700 text-gray-800 dark:text-stone-300';
      default: return 'bg-gray-100 dark:bg-stone-700 text-gray-800 dark:text-stone-300';
    }
  };

  const pendingCount = () => invitations()?.length || 0;

  return (
    <div class="relative">
      <button
        onClick={() => setShowInvitations(!showInvitations())}
        class="relative p-2 text-emerald-100 hover:text-white transition-colors"
        title="Cookbook Invitations"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
        </svg>
        <Show when={pendingCount() > 0}>
          <span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {pendingCount()}
          </span>
        </Show>
      </button>

      <Show when={showInvitations()}>
        <div class="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-stone-800 rounded-lg shadow-lg border border-gray-200 dark:border-stone-600 z-50">
          <div class="p-4 border-b border-gray-200 dark:border-stone-600">
            <h3 class="font-semibold text-gray-900 dark:text-stone-100">Cookbook Invitations</h3>
          </div>
          
          <div class="max-h-96 overflow-y-auto">
            <Show when={invitations.loading}>
              <div class="p-4 text-center text-gray-500 dark:text-stone-400">Loading invitations...</div>
            </Show>

            <Show when={invitations.error}>
              <div class="p-4 text-center text-red-600 dark:text-red-400">
                <div class="text-sm">Failed to load invitations</div>
                <div class="text-xs text-gray-500 dark:text-stone-400 mt-1">{invitations.error.message}</div>
              </div>
            </Show>

            <Show when={invitations() && pendingCount() === 0}>
              <div class="p-4 text-center text-gray-500 dark:text-stone-400">No pending invitations</div>
            </Show>

            <Show when={invitations() && pendingCount() > 0}>
              <For each={invitations()}>
                {(invitation) => (
                  <div class="p-4 border-b border-gray-100 dark:border-stone-700 last:border-b-0">
                    <div class="space-y-3">
                      <div>
                        <div class="font-medium text-gray-900 dark:text-stone-100">{invitation.cookbook.title}</div>
                        <div class="text-sm text-gray-600 dark:text-stone-400">
                          Invited by {invitation.inviter.name || invitation.inviter.email}
                        </div>
                        <div class="flex items-center space-x-2 mt-1">
                          <span class={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(invitation.role)}`}>
                            {invitation.role}
                          </span>
                          <span class="text-xs text-gray-400 dark:text-stone-500">
                            {new Date(invitation.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <Show when={invitation.message}>
                        <div class="text-sm text-gray-600 dark:text-stone-400 italic">
                          "{invitation.message}"
                        </div>
                      </Show>

                      <Show when={invitation.cookbook.description}>
                        <div class="text-sm text-gray-500 dark:text-stone-400">
                          {invitation.cookbook.description}
                        </div>
                      </Show>

                      <div class="flex space-x-2">
                        <button
                          onClick={() => handleInvitationResponse(invitation.id, 'accepted')}
                          disabled={isResponding() === invitation.id}
                          class="flex-1 bg-emerald-600 text-white py-2 px-3 rounded-md text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                          {isResponding() === invitation.id ? 'Accepting...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleInvitationResponse(invitation.id, 'declined')}
                          disabled={isResponding() === invitation.id}
                          class="flex-1 bg-gray-300 dark:bg-stone-600 text-gray-700 dark:text-stone-300 py-2 px-3 rounded-md text-sm hover:bg-gray-400 dark:hover:bg-stone-500 disabled:opacity-50 transition-colors"
                        >
                          {isResponding() === invitation.id ? 'Declining...' : 'Decline'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </Show>

      {/* Click outside to close */}
      <Show when={showInvitations()}>
        <div 
          class="fixed inset-0 z-40"
          onClick={() => setShowInvitations(false)}
        />
      </Show>
    </div>
  );
}