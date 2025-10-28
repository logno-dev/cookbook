import { Title } from "@solidjs/meta";
import { createSignal, createResource, Show, For } from "solid-js";
import { useAuth } from "~/lib/auth-context";
import { Navigate } from "@solidjs/router";
import PageLayout from "~/components/PageLayout";
import { useToast } from "~/lib/notifications";

interface CookbookMember {
  id: string;
  userId: string;
  role: 'owner' | 'editor' | 'contributor' | 'reader';
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

interface Cookbook {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  members: CookbookMember[];
  userRole: 'owner' | 'editor' | 'contributor' | 'reader';
}

async function fetchCookbooks(): Promise<Cookbook[]> {
  const response = await fetch('/api/cookbooks');
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch cookbooks (${response.status}): ${errorText}`);
  }
  const data = await response.json();
  return data.cookbooks || [];
}

export default function CookbooksPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [showCreateForm, setShowCreateForm] = createSignal(false);
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [isCreating, setIsCreating] = createSignal(false);

  if (!user()) {
    return <Navigate href="/login" />;
  }

  const [cookbooks, { refetch }] = createResource(
    () => user(), // Only fetch when user is available
    async (userData) => {
      if (!userData) return [];
      return fetchCookbooks();
    }
  );

  const handleCreateCookbook = async (e: Event) => {
    e.preventDefault();
    if (!title().trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/cookbooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: title(), 
          description: description() || undefined 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create cookbook');
      }
      
      setTitle("");
      setDescription("");
      setShowCreateForm(false);
      refetch();
    } catch (error) {
      console.error('Failed to create cookbook:', error);
      toast.error('Failed to create cookbook');
    } finally {
      setIsCreating(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'editor': return 'bg-blue-100 text-blue-800';
      case 'contributor': return 'bg-green-100 text-green-800';
      case 'reader': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const headerActions = () => (
    <button
      onClick={() => setShowCreateForm(!showCreateForm())}
      class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm sm:text-base whitespace-nowrap"
    >
      Create Cookbook
    </button>
  );

  return (
    <>
      <Title>Cookbooks - Recipe Curator</Title>
      <PageLayout
        title="My Cookbooks"
        headerActions={headerActions()}
        maxWidth="6xl"
      >

        <Show when={showCreateForm()}>
          <div class="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 class="text-xl font-semibold mb-4">Create New Cookbook</h2>
            <form onSubmit={handleCreateCookbook}>
              <div class="mb-4">
                <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  id="title"
                  type="text"
                  value={title()}
                  onInput={(e) => setTitle(e.currentTarget.value)}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div class="mb-4">
                <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description()}
                  onInput={(e) => setDescription(e.currentTarget.value)}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows="3"
                />
              </div>
              <div class="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  class="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating() || !title()}
                  class="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isCreating() ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </Show>

          <Show when={cookbooks.loading}>
            <div class="text-center py-8">
              <div class="text-gray-600">Loading cookbooks...</div>
            </div>
          </Show>

          <Show when={cookbooks.error}>
            <div class="text-center py-8">
              <div class="text-red-600">Failed to load cookbooks</div>
            </div>
          </Show>

        <Show when={cookbooks()}>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <For each={cookbooks()}>
              {(cookbook) => (
                <div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                  <div class="p-6">
                    <div class="flex items-start justify-between mb-4">
                      <h3 class="text-lg font-semibold text-gray-900 truncate flex-1">
                        {cookbook.title}
                      </h3>
                      <span class={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(cookbook.userRole)} ml-2 flex-shrink-0`}>
                        {cookbook.userRole}
                      </span>
                    </div>
                    
                    <Show when={cookbook.description}>
                      <p class="text-gray-600 text-sm mb-4 line-clamp-3">
                        {cookbook.description}
                      </p>
                    </Show>
                    
                    <div class="text-xs text-gray-500 mb-4">
                      <p>Members: {cookbook.members.length}</p>
                      <p>Created: {new Date(cookbook.createdAt).toLocaleDateString()}</p>
                    </div>
                    
                    <div class="flex space-x-2">
                      <a
                        href={`/cookbooks/${cookbook.id}`}
                        class="flex-1 bg-emerald-600 text-white text-center py-2 px-4 rounded-md hover:bg-emerald-700 transition-colors text-sm"
                      >
                        View Cookbook
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </PageLayout>
    </>
  );
}