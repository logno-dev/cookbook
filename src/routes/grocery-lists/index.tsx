import { createSignal, Show, For, createEffect } from 'solid-js';
import { useAuth } from '../../lib/auth-context';
import { useNavigate } from '@solidjs/router';
import { Title } from '@solidjs/meta';
import PageLayout from '../../components/PageLayout';
import { SkeletonCardGrid, SkeletonPageHeader } from '../../components/Skeletons';
import { useConfirm, useToast } from '../../lib/notifications';

interface GroceryList {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export default function GroceryListsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [groceryLists, setGroceryLists] = createSignal<GroceryList[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [isCreating, setIsCreating] = createSignal(false);
  const [newListName, setNewListName] = createSignal('');
  const [newListDescription, setNewListDescription] = createSignal('');
  const [deletingListId, setDeletingListId] = createSignal<string | null>(null);

  // Non-blocking auth redirect
  createEffect(() => {
    if (!loading() && !user()) {
      navigate("/login", { replace: true });
    }
  });

  // Remove early return - use conditional JSX rendering instead

  // Load grocery lists when user becomes available
  const loadGroceryLists = async () => {
    try {
      const response = await fetch('/api/grocery-lists');
      if (response.ok) {
        const data = await response.json();
        setGroceryLists(data.groceryLists || []);
      } else {
        console.warn('Failed to load grocery lists:', response.status);
        setGroceryLists([]);
      }
    } catch (error) {
      console.error('Error loading grocery lists:', error);
      setGroceryLists([]);
    } finally {
      setIsLoading(false);
    }
  };

  createEffect(() => {
    if (!loading() && user()) {
      loadGroceryLists();
    } else if (!loading()) {
      setIsLoading(false);
    }
  });

  const handleCreateList = async (e: Event) => {
    e.preventDefault();
    
    if (!newListName().trim() || isCreating()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/grocery-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newListName().trim(),
          description: newListDescription().trim() || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGroceryLists(prev => [data.groceryList, ...prev]);
        setNewListName('');
        setNewListDescription('');
        
        // Navigate to the newly created list
        navigate(`/grocery-lists/${data.groceryList.id}`);
      } else {
        console.error('Failed to create grocery list');
        toast.error('Failed to create grocery list');
      }
    } catch (error) {
      console.error('Error creating grocery list:', error);
      toast.error('Error creating grocery list');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDeleteList = async (listId: string, listName: string) => {
    const confirmed = await confirm.confirm({
      title: "Delete Grocery List",
      message: `Are you sure you want to delete "${listName}"? This action cannot be undone.`,
      confirmText: "Delete List",
      variant: "danger"
    });
    
    if (!confirmed) {
      return;
    }

    setDeletingListId(listId);
    try {
      const response = await fetch(`/api/grocery-lists/${listId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setGroceryLists(prev => prev.filter(list => list.id !== listId));
        toast.success(`"${listName}" deleted successfully`);
      } else {
        console.error('Failed to delete grocery list');
        toast.error('Failed to delete grocery list');
      }
    } catch (error) {
      console.error('Error deleting grocery list:', error);
      toast.error('Error deleting grocery list');
    } finally {
      setDeletingListId(null);
    }
  };

  return (
    <>
      <Title>Grocery Lists - Recipe Curator</Title>
      {/* Show skeleton while auth is loading */}
      {loading() || (!user() && !loading()) ? (
        <main class="min-h-screen bg-gray-50 pt-16">
          <div class="max-w-6xl mx-auto px-4 py-8">
            <SkeletonPageHeader />
            <SkeletonCardGrid count={6} />
          </div>
        </main>
      ) : (
        <PageLayout
          title="Grocery Lists"
          subtitle="Create shopping lists from your recipes"
        >
          {/* Show skeleton while loading grocery lists */}
          {isLoading() ? (
            <>
              <SkeletonPageHeader />
              <SkeletonCardGrid count={6} />
            </>
          ) : (
            <>
          {/* Create New List Form */}
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Create New List</h2>
            <form onSubmit={handleCreateList}>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
                    List Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={newListName()}
                    onInput={(e) => setNewListName(e.target.value)}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Weekly Groceries, Dinner Party"
                    required
                  />
                </div>
                <div>
                  <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    id="description"
                    value={newListDescription()}
                    onInput={(e) => setNewListDescription(e.target.value)}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <div class="mt-4">
                <button
                  type="submit"
                  disabled={isCreating() || !newListName().trim()}
                  class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating() ? 'Creating...' : 'Create List'}
                </button>
              </div>
            </form>
          </div>

          {/* Grocery Lists Grid */}
          <Show
            when={groceryLists().length > 0}
            fallback={
              <div class="text-center py-12">
                <div class="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">No grocery lists yet</h3>
                <p class="text-gray-500 mb-4">Create your first grocery list to get started</p>
              </div>
            }
          >
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <For each={groceryLists()}>
                {(list) => (
                  <div 
                    class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/grocery-lists/${list.id}`)}
                  >
                    <div class="p-6">
                      <div class="flex items-start justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 truncate">
                          {list.name}
                        </h3>
                        <div class="flex items-center space-x-2 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteList(list.id, list.name);
                            }}
                            disabled={deletingListId() === list.id}
                            class="text-red-500 hover:text-red-700 transition-colors p-1 disabled:opacity-50"
                            title="Delete list"
                          >
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <Show when={list.description}>
                        <p class="text-gray-600 text-sm mb-4 line-clamp-2">
                          {list.description}
                        </p>
                      </Show>
                      
                      <div class="flex items-center justify-between text-sm text-gray-500">
                        <span>Created {formatDate(list.createdAt)}</span>
                        <Show when={list.updatedAt !== list.createdAt}>
                          <span>Updated {formatDate(list.updatedAt)}</span>
                        </Show>
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
            </>
          )}
        </PageLayout>
      )}
    </>
  );
}