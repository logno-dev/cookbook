import { Title } from "@solidjs/meta";
import { createSignal, createResource, Show, For } from "solid-js";
import { useAuth } from "~/lib/auth-context";
import { Navigate, useParams } from "@solidjs/router";
import { useToast } from "~/lib/notifications";

interface Recipe {
  id: string;
  title: string;
  description?: string;
  cookTime?: number;
  prepTime?: number;
  servings?: number;
  difficulty?: string;
  cuisine?: string;
  createdAt: string;
  tags: Array<{ id: string; name: string; color: string; }>;
}

interface Cookbook {
  id: string;
  title: string;
  userRole: 'owner' | 'editor' | 'contributor' | 'reader';
}

async function fetchUserRecipes(): Promise<Recipe[]> {
  const response = await fetch('/api/recipes');
  if (!response.ok) {
    throw new Error('Failed to fetch recipes');
  }
  const data = await response.json();
  return data.recipes;
}

async function fetchCookbook(id: string): Promise<Cookbook> {
  const response = await fetch(`/api/cookbooks/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch cookbook');
  }
  const data = await response.json();
  return data.cookbook;
}

async function addRecipeToCookbook(cookbookId: string, recipeId: string, notes?: string): Promise<void> {
  const response = await fetch(`/api/cookbooks/${cookbookId}/recipes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipeId, notes }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add recipe to cookbook');
  }
}

export default function AddRecipePage() {
  const { user } = useAuth();
  const params = useParams();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = createSignal("");
  const [selectedRecipe, setSelectedRecipe] = createSignal<Recipe | null>(null);
  const [notes, setNotes] = createSignal("");
  const [isAdding, setIsAdding] = createSignal(false);

  if (!user()) {
    return <Navigate href="/login" />;
  }

  const [cookbook] = createResource(() => params.id, fetchCookbook);
  const [recipes] = createResource(fetchUserRecipes);

  const filteredRecipes = () => {
    const allRecipes = recipes() || [];
    const query = searchQuery().toLowerCase();
    if (!query) return allRecipes;
    
    return allRecipes.filter(recipe => 
      recipe.title.toLowerCase().includes(query) ||
      (recipe.description && recipe.description.toLowerCase().includes(query)) ||
      recipe.tags.some(tag => tag.name.toLowerCase().includes(query)) ||
      (recipe.cuisine && recipe.cuisine.toLowerCase().includes(query))
    );
  };

  const handleAddRecipe = async () => {
    const recipe = selectedRecipe();
    if (!recipe) return;

    setIsAdding(true);
    try {
      await addRecipeToCookbook(params.id, recipe.id, notes() || undefined);
      window.location.href = `/cookbooks/${params.id}`;
    } catch (error) {
      console.error('Failed to add recipe:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add recipe to cookbook');
    } finally {
      setIsAdding(false);
    }
  };

  const canAddRecipes = () => {
    const cb = cookbook();
    return cb && ['owner', 'editor', 'contributor'].includes(cb.userRole);
  };

  return (
    <>
      <Title>Add Recipe - {cookbook()?.title || 'Loading...'} - Recipe Curator</Title>
      <div class="min-h-screen bg-gray-50 pt-20">
        <div class="max-w-6xl mx-auto px-4 py-8">
          <Show when={cookbook.loading || recipes.loading}>
            <div class="text-center py-8">
              <div class="text-gray-600">Loading...</div>
            </div>
          </Show>

          <Show when={cookbook.error || recipes.error}>
            <div class="text-center py-8">
              <div class="text-red-600">Failed to load data</div>
              <a href={`/cookbooks/${params.id}`} class="text-emerald-600 hover:underline mt-4 inline-block">
                ← Back to Cookbook
              </a>
            </div>
          </Show>

          <Show when={cookbook() && !canAddRecipes()}>
            <div class="text-center py-8">
              <div class="text-red-600">You don't have permission to add recipes to this cookbook</div>
              <a href={`/cookbooks/${params.id}`} class="text-emerald-600 hover:underline mt-4 inline-block">
                ← Back to Cookbook
              </a>
            </div>
          </Show>

          <Show when={cookbook() && recipes() && canAddRecipes()}>
            <div class="space-y-8">
              {/* Header */}
              <div class="flex justify-between items-center">
                <div>
                  <h1 class="text-3xl font-bold text-gray-900">Add Recipe to Cookbook</h1>
                  <p class="text-gray-600 mt-2">Adding to: <strong>{cookbook()!.title}</strong></p>
                </div>
                <a 
                  href={`/cookbooks/${params.id}`}
                  class="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                >
                  ← Back to Cookbook
                </a>
              </div>

              {/* Search */}
              <div class="bg-white rounded-lg shadow-md p-6">
                <div class="mb-4">
                  <label for="search" class="block text-sm font-medium text-gray-700 mb-2">
                    Search Your Recipes
                  </label>
                  <input
                    id="search"
                    type="text"
                    value={searchQuery()}
                    onInput={(e) => setSearchQuery(e.currentTarget.value)}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Search by title, description, tags, or cuisine..."
                  />
                </div>
              </div>

              {/* Recipe Selection */}
              <div class="bg-white rounded-lg shadow-md p-6">
                <h2 class="text-xl font-semibold mb-4">Select a Recipe</h2>
                
                <Show when={filteredRecipes().length === 0}>
                  <div class="text-center py-8">
                    <Show when={searchQuery()}>
                      <div class="text-gray-500">No recipes found matching "{searchQuery()}"</div>
                    </Show>
                    <Show when={!searchQuery()}>
                      <div class="text-gray-500 mb-4">You don't have any recipes yet</div>
                      <a
                        href="/dashboard"
                        class="text-emerald-600 hover:underline"
                      >
                        Create your first recipe →
                      </a>
                    </Show>
                  </div>
                </Show>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <For each={filteredRecipes()}>
                    {(recipe) => (
                      <div 
                        class={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          selectedRecipe()?.id === recipe.id 
                            ? 'border-emerald-500 bg-emerald-50' 
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                        onClick={() => setSelectedRecipe(recipe)}
                      >
                        <h3 class="font-semibold text-lg mb-2">{recipe.title}</h3>
                        
                        <Show when={recipe.description}>
                          <p class="text-gray-600 text-sm mb-3 line-clamp-2">{recipe.description}</p>
                        </Show>

                        <div class="flex flex-wrap gap-1 mb-3">
                          <For each={recipe.tags.slice(0, 3)}>
                            {(tag) => (
                              <span 
                                class="px-2 py-1 text-xs rounded-full text-white"
                                style={{ 'background-color': tag.color }}
                              >
                                {tag.name}
                              </span>
                            )}
                          </For>
                          <Show when={recipe.tags.length > 3}>
                            <span class="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-700">
                              +{recipe.tags.length - 3}
                            </span>
                          </Show>
                        </div>

                        <div class="flex justify-between items-center text-xs text-gray-500">
                          <Show when={recipe.cookTime}>
                            <span>{recipe.cookTime} min</span>
                          </Show>
                          <Show when={recipe.servings}>
                            <span>{recipe.servings} servings</span>
                          </Show>
                          <Show when={recipe.difficulty}>
                            <span>{recipe.difficulty}</span>
                          </Show>
                        </div>

                        <Show when={selectedRecipe()?.id === recipe.id}>
                          <div class="mt-3 pt-3 border-t border-emerald-200">
                            <div class="flex items-center text-emerald-600 text-sm font-medium">
                              <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                              </svg>
                              Selected
                            </div>
                          </div>
                        </Show>
                      </div>
                    )}
                  </For>
                </div>
              </div>

              {/* Add Recipe Form */}
              <Show when={selectedRecipe()}>
                <div class="bg-white rounded-lg shadow-md p-6">
                  <h2 class="text-xl font-semibold mb-4">Add Recipe Details</h2>
                  
                  <div class="mb-4">
                    <div class="text-sm text-gray-600 mb-2">
                      Selected Recipe: <strong>{selectedRecipe()!.title}</strong>
                    </div>
                  </div>

                  <div class="mb-6">
                    <label for="notes" class="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      id="notes"
                      value={notes()}
                      onInput={(e) => setNotes(e.currentTarget.value)}
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Add any notes about this recipe for the cookbook (e.g., modifications, serving suggestions, etc.)"
                      rows="4"
                    />
                  </div>

                  <div class="flex space-x-3">
                    <button
                      onClick={handleAddRecipe}
                      disabled={isAdding()}
                      class="bg-emerald-600 text-white px-6 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {isAdding() ? 'Adding Recipe...' : 'Add Recipe to Cookbook'}
                    </button>
                    <button
                      onClick={() => setSelectedRecipe(null)}
                      class="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              </Show>
            </div>
          </Show>
        </div>
      </div>
    </>
  );
}