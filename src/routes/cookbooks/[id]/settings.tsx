import { Title } from "@solidjs/meta";
import { createSignal, createResource, Show, For, createEffect } from "solid-js";
import { useAuth } from "~/lib/auth-context";
import { Navigate, useParams, useNavigate } from "@solidjs/router";
import PageLayout from "~/components/PageLayout";
import Breadcrumbs from "~/components/Breadcrumbs";
import { SkeletonCardGrid } from "~/components/Skeletons";
import { useConfirm, useToast } from "~/lib/notifications";
// We'll create our own modal component below

interface Cookbook {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  userRole: 'owner' | 'editor' | 'contributor' | 'reader';
}

interface CookbookRecipe {
  id: string;
  cookbookId: string;
  recipe: {
    id: string;
    title: string;
    description?: string;
    cookTime?: number;
    prepTime?: number;
    servings?: number;
    difficulty?: string;
    cuisine?: string;
    tags: Array<{ id: string; name: string; color: string; }>;
  };
  addedByUserId: string;
  originalRecipeId?: string;
  notes?: string;
  addedAt: string;
  addedByUser: {
    id: string;
    email: string;
    name?: string;
  };
  canEdit: boolean;
  isOriginalOwner: boolean;
}

async function fetchCookbook(id: string): Promise<Cookbook> {
  const response = await fetch(`/api/cookbooks/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch cookbook');
  }
  const data = await response.json();
  return data.cookbook;
}

async function fetchCookbookRecipes(id: string): Promise<CookbookRecipe[]> {
  const response = await fetch(`/api/cookbooks/${id}/recipes`);
  if (!response.ok) {
    throw new Error('Failed to fetch cookbook recipes');
  }
  const data = await response.json();
  return data.recipes;
}

async function updateCookbook(id: string, data: { title: string; description?: string; isPublic: boolean }): Promise<void> {
  const response = await fetch(`/api/cookbooks/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update cookbook');
  }
}

async function deleteCookbook(id: string, confirmationName: string): Promise<void> {
  const response = await fetch(`/api/cookbooks/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirmationName }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete cookbook');
  }
}

async function removeRecipeFromCookbook(cookbookId: string, cookbookRecipeId: string): Promise<void> {
  const response = await fetch(`/api/cookbooks/${cookbookId}/recipes/${cookbookRecipeId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove recipe');
  }
}

// Simple Modal Component
function Modal(props: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  confirmText: string;
  isLoading: boolean;
  children: any;
}) {
  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          {/* Backdrop */}
          <div 
            class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={props.onClose}
          />
          
          {/* Modal */}
          <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 class="text-base font-semibold leading-6 text-gray-900">
                    {props.title}
                  </h3>
                  <div class="mt-2">
                    {props.children}
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="button"
                class="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto disabled:opacity-50"
                onClick={props.onConfirm}
                disabled={props.isLoading || (props.title === "Delete Cookbook" && !canDeleteCookbook())}
              >
                {props.isLoading ? 'Processing...' : props.confirmText}
              </button>
              <button
                type="button"
                class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                onClick={props.onClose}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}

export default function CookbookSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  // Form state
  const [isUpdating, setIsUpdating] = createSignal(false);
  
  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = createSignal(false);
  const [deleteConfirmationName, setDeleteConfirmationName] = createSignal("");
  const [isDeleting, setIsDeleting] = createSignal(false);
  
  // Recipe management state
  const [showRecipeManagement, setShowRecipeManagement] = createSignal(false);
  const [removingRecipe, setRemovingRecipe] = createSignal<string | null>(null);

  // Auth redirect effect - only redirect after loading completes
  createEffect(() => {
    if (!authLoading() && !user()) {
      navigate("/login", { replace: true });
    }
  });

  const [cookbook, { refetch: refetchCookbook }] = createResource(() => params.id, fetchCookbook);
  const [recipes, { refetch: refetchRecipes }] = createResource(() => params.id, fetchCookbookRecipes);

  // Initialize form when cookbook loads
  createEffect(() => {
    const cb = cookbook();
    if (cb) {
      setEditTitle(cb.title);
      setEditDescription(cb.description || "");
      setEditIsPublic(cb.isPublic);
    }
  });

  const canEdit = () => {
    const cb = cookbook();
    return cb && ['owner', 'editor'].includes(cb.userRole);
  };

  const canDelete = () => {
    const cb = cookbook();
    return cb && cb.userRole === 'owner';
  };

  const canManageRecipes = () => {
    const cb = cookbook();
    return cb && ['owner', 'editor'].includes(cb.userRole);
  };

  const handleUpdateCookbook = async (e: Event) => {
    e.preventDefault();
    if (!cookbook()) return;

    setIsUpdating(true);
    try {
      await updateCookbook(cookbook()!.id, {
        title: editTitle(),
        description: editDescription() || undefined,
        isPublic: editIsPublic(),
      });
      
      setIsEditing(false);
      refetchCookbook();
      toast.success('Cookbook updated successfully!');
    } catch (error) {
      console.error('Failed to update cookbook:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update cookbook');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCookbook = async () => {
    if (!cookbook() || deleteConfirmationName() !== cookbook()?.title) return;

    setIsDeleting(true);
    try {
      await deleteCookbook(cookbook()!.id, deleteConfirmationName());
      toast.success('Cookbook deleted successfully');
      navigate('/cookbooks');
    } catch (error) {
      console.error('Failed to delete cookbook:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete cookbook');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmationName("");
    }
  };

  const canDeleteCookbook = () => deleteConfirmationName() === cookbook()?.title;

  const handleRemoveRecipe = async (cookbookRecipeId: string, recipeTitle: string) => {
    if (!cookbook()) return;

    setRemovingRecipe(cookbookRecipeId);
    try {
      await removeRecipeFromCookbook(cookbook()!.id, cookbookRecipeId);
      refetchRecipes();
      toast.success(`"${recipeTitle}" removed from cookbook`);
    } catch (error) {
      console.error('Failed to remove recipe:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove recipe');
    } finally {
      setRemovingRecipe(null);
    }
  };

  const cancelEdit = () => {
    const cb = cookbook();
    if (cb) {
      setEditTitle(cb.title);
      setEditDescription(cb.description || "");
      setEditIsPublic(cb.isPublic);
    }
    setIsEditing(false);
  };

  const breadcrumbItems = () => [
    { label: 'Cookbooks', href: '/cookbooks' },
    { label: cookbook()?.title || 'Loading...', href: `/cookbooks/${params.id}` },
    { label: 'Settings', current: true },
  ];

  return (
    <>
      <Title>Settings - {cookbook()?.title || 'Loading...'} - Recipe Curator</Title>
      <PageLayout
        title="Cookbook Settings"
        subtitle={cookbook() ? `Managing "${cookbook()!.title}"` : undefined}
        breadcrumbs={<Breadcrumbs items={breadcrumbItems()} />}
        loading={cookbook.loading}
        error={cookbook.error ? 'Cookbook not found or access denied' : undefined}
      >
        <div class="space-y-8">
          {/* Basic Information */}
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-xl font-semibold">Basic Information</h2>
              <Show when={canEdit() && !isEditing()}>
                <button
                  onClick={() => setIsEditing(true)}
                  class="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors text-sm"
                >
                  Edit Details
                </button>
              </Show>
            </div>

            <Show when={!isEditing() && cookbook()}>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <p class="text-gray-900">{cookbook()!.title}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p class="text-gray-900">{cookbook()!.description || 'No description provided'}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                  <span class={`px-2 py-1 text-xs font-medium rounded-full ${
                    cookbook()!.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {cookbook()!.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Created</label>
                  <p class="text-gray-900">{new Date(cookbook()!.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </Show>

            <Show when={isEditing()}>
              <form onSubmit={handleUpdateCookbook} class="space-y-4">
                <div>
                  <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={editTitle()}
                    onInput={(e) => setEditTitle(e.currentTarget.value)}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={editDescription()}
                    onInput={(e) => setEditDescription(e.currentTarget.value)}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    rows="3"
                    placeholder="Describe your cookbook..."
                  />
                </div>
                <div>
                  <label class="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={editIsPublic()}
                      onChange={(e) => setEditIsPublic(e.currentTarget.checked)}
                      class="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <span class="text-sm text-gray-700">Make this cookbook public</span>
                  </label>
                  <p class="text-xs text-gray-500 mt-1">Public cookbooks can be viewed by anyone</p>
                </div>
                <div class="flex space-x-3">
                  <button
                    type="submit"
                    disabled={isUpdating()}
                    class="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {isUpdating() ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    class="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </Show>
          </div>

          {/* Recipe Management */}
          <Show when={canManageRecipes()}>
            <div class="bg-white rounded-lg shadow-md p-6">
              <div class="flex justify-between items-center mb-6">
                <button
                  onClick={() => setShowRecipeManagement(!showRecipeManagement())}
                  class="flex items-center space-x-2 text-left"
                >
                  <h2 class="text-xl font-semibold">Recipe Management</h2>
                  <svg 
                    class={`w-5 h-5 transform transition-transform ${showRecipeManagement() ? 'rotate-180' : ''}`}
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
                <span class="text-sm text-gray-500">
                  {recipes() ? `${recipes()!.length} recipe${recipes()!.length !== 1 ? 's' : ''}` : ''}
                </span>
              </div>

              <Show when={showRecipeManagement()}>
                <div>
                  <Show when={recipes.loading}>
                    <div class="mt-4">
                      <SkeletonCardGrid count={3} />
                    </div>
                  </Show>

                  <Show when={recipes() && recipes()!.length === 0}>
                    <p class="text-gray-500 text-center py-8">No recipes in this cookbook</p>
                  </Show>

                  <Show when={recipes() && recipes()!.length > 0}>
                    <div class="space-y-3">
                      <For each={recipes()}>
                        {(recipe) => (
                          <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                            <div class="flex-1">
                              <h3 class="font-medium text-gray-900">{recipe.recipe.title}</h3>
                              <p class="text-sm text-gray-500">
                                Added by {recipe.addedByUser.name || recipe.addedByUser.email} • {new Date(recipe.addedAt).toLocaleDateString()}
                              </p>
                              <Show when={recipe.notes}>
                                <p class="text-sm text-gray-600 italic">"{recipe.notes}"</p>
                              </Show>
                            </div>
                            <div class="flex items-center space-x-2">
                              <a
                                href={`/recipe/${recipe.recipe.id}`}
                                class="text-emerald-600 hover:text-emerald-700 text-sm"
                              >
                                View
                              </a>
                              <button
                                onClick={() => handleRemoveRecipe(recipe.id, recipe.recipe.title)}
                                disabled={removingRecipe() === recipe.id}
                                class="text-red-600 hover:text-red-700 text-sm disabled:opacity-50"
                              >
                                {removingRecipe() === recipe.id ? 'Removing...' : 'Remove'}
                              </button>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              </Show>
            </div>
          </Show>

          {/* Danger Zone */}
          <Show when={canDelete()}>
            <div class="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
              <h2 class="text-xl font-semibold text-red-600 mb-4">Danger Zone</h2>
              <div class="bg-red-50 p-4 rounded-md">
                <div class="flex">
                  <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <div class="ml-3">
                    <h3 class="text-sm font-medium text-red-800">Delete Cookbook</h3>
                    <div class="mt-2 text-sm text-red-700">
                      <p>
                        Permanently delete this cookbook and all its recipes. This action cannot be undone.
                        All members will lose access and all recipe data will be lost forever.
                      </p>
                    </div>
                    <div class="mt-4">
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        Delete Cookbook
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Show>
        </div>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal()}
          onClose={() => {
            setShowDeleteModal(false);
            setDeleteConfirmationName("");
          }}
          onConfirm={handleDeleteCookbook}
          title="Delete Cookbook"
          confirmText="Delete Forever"
          isLoading={isDeleting()}
        >
          <div class="space-y-4">
            <p class="text-sm text-gray-500">
              This will permanently delete <strong>"{cookbook()?.title}"</strong> and all its recipes. 
              This action cannot be undone.
            </p>
            <p class="text-sm text-gray-500">
              To confirm deletion, please type the cookbook name exactly as it appears:
            </p>
            <div class="bg-gray-50 p-3 rounded-md">
              <code class="text-sm font-mono">{cookbook()?.title}</code>
            </div>
            <input
              type="text"
              value={deleteConfirmationName()}
              onInput={(e) => setDeleteConfirmationName(e.currentTarget.value)}
              placeholder="Type cookbook name here"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <Show when={deleteConfirmationName() && deleteConfirmationName() !== cookbook()?.title}>
              <p class="text-sm text-red-600">The name doesn't match. Please try again.</p>
            </Show>
          </div>
        </Modal>
      </PageLayout>
    </>
  );
}