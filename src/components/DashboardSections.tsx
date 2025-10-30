import { For, Show, createMemo, createResource, createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useAuth } from "~/lib/auth-context";
import { api } from "~/lib/api-client";
import { useTags, useCookbooks, useFilteredRecipes } from "~/lib/stores";
import { SkeletonCardGrid, SkeletonFilters } from "./Skeletons";

// Search and Tags Filter Section
export function SearchAndFilters(props: {
  searchQuery: () => string;
  setSearchQuery: (value: string) => void;
  selectedTags: () => string[];
  toggleTag: (tagId: string) => void;
}) {
  const tagsStore = useTags();

  return (
    <>
      {/* Search Bar */}
      <div class="mb-6">
        <input
          type="text"
          placeholder="Search recipes..."
          value={props.searchQuery()}
          onInput={(e) => props.setSearchQuery(e.currentTarget.value)}
          class="w-full px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder:text-gray-500 dark:placeholder:text-stone-400"
        />
      </div>

      {/* Tags Filter */}
      <Show when={tagsStore.data()} fallback={<SkeletonFilters />}>
        <div class="mb-6">
          <h3 class="text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">Filter by tags:</h3>
          <div class="flex flex-wrap gap-2">
            <For each={tagsStore.data()}>
              {(tag) => (
                <button
                  onClick={() => props.toggleTag(tag.id)}
                  class={`px-3 py-1 rounded-full text-sm transition-colors ${
                    props.selectedTags().includes(tag.id)
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-stone-600 dark:text-stone-100 dark:hover:bg-stone-500"
                  }`}
                  style={{ "background-color": props.selectedTags().includes(tag.id) ? tag.color : undefined }}
                >
                  {tag.name}
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>
    </>
  );
}

// Main Recipes Grid Section
export function RecipesGrid(props: {
  filteredRecipes: () => any[];
  formatTime: (minutes?: number) => string;
  showAddRecipe: () => boolean;
  setShowAddRecipe: (show: boolean) => void;
}) {
  const navigate = useNavigate();

  return (
    <div class="mb-8">
      <div class="mb-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-stone-100">My Recipes</h2>
      </div>

      <Show when={props.filteredRecipes() && props.filteredRecipes().length === 0}>
        <div class="text-center py-12">
          <div class="text-gray-400 text-6xl mb-4">🍽️</div>
          <h3 class="text-xl font-medium text-gray-900 dark:text-stone-100 mb-2">No recipes yet</h3>
          <p class="text-gray-600 dark:text-stone-400 mb-4">Start building your recipe collection!</p>
          <button
            onClick={() => props.setShowAddRecipe(true)}
            class="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            Add Your First Recipe
          </button>
        </div>
      </Show>

      <Show when={props.filteredRecipes() && props.filteredRecipes().length > 0}>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <For each={props.filteredRecipes()}>
            {(recipe) => (
              <div 
                class="bg-white dark:bg-stone-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/recipe/${recipe.id}?from=dashboard`)}
              >
                <Show when={recipe.imageUrl}>
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.title}
                    class="w-full h-48 object-cover"
                  />
                </Show>
                
                <div class="p-6">
                  <h3 class="text-xl font-semibold text-gray-900 dark:text-stone-100 mb-2">{recipe.title}</h3>
                  
                  <Show when={recipe.description}>
                    <p class="text-gray-600 dark:text-stone-400 mb-3 line-clamp-2">{recipe.description}</p>
                  </Show>

                  <div class="flex flex-wrap gap-2 mb-3">
                    <Show when={recipe.cookTime}>
                      <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        🕐 {props.formatTime(recipe.cookTime)}
                      </span>
                    </Show>
                    <Show when={recipe.servings}>
                      <span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        👥 {recipe.servings} servings
                      </span>
                    </Show>
                    <Show when={recipe.difficulty}>
                      <span class="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                        {recipe.difficulty}
                      </span>
                    </Show>
                  </div>

                  <Show when={recipe.tags.length > 0}>
                    <div class="flex flex-wrap gap-1 mb-4">
                      <For each={recipe.tags}>
                        {(tag) => (
                          <span
                            class="px-2 py-1 text-xs rounded-full text-white"
                            style={{ "background-color": tag.color }}
                          >
                            {tag.name}
                          </span>
                        )}
                      </For>
                    </div>
                  </Show>

                  <Show when={recipe.sourceUrl}>
                    <div class="flex justify-end">
                      <a
                        href={recipe.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-gray-500 hover:text-gray-700 dark:text-stone-400 dark:hover:text-stone-300 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Source ↗
                      </a>
                    </div>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

// Recent Cookbooks Section
export function RecentCookbooks() {
  const navigate = useNavigate();
  const cookbooksStore = useCookbooks();
  
  // Recent cookbooks with memoization (limit to 5)
  const recentCookbooks = createMemo(() => {
    const cookbooks = cookbooksStore.data();
    if (!cookbooks) return [];
    
    return cookbooks
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  });

  return (
    <div class="mt-12 mb-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900">Recent Cookbooks</h2>
        <a
          href="/cookbooks"
          class="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
        >
          View all →
        </a>
      </div>
      
      <Show when={recentCookbooks() && recentCookbooks().length === 0}>
        <div class="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div class="text-gray-400 text-4xl mb-2">📚</div>
          <p class="text-gray-600">No cookbooks yet</p>
          <a
            href="/cookbooks"
            class="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
          >
            Create your first cookbook
          </a>
        </div>
      </Show>
      
      <Show when={recentCookbooks() && recentCookbooks().length > 0}>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <For each={recentCookbooks()}>
            {(cookbook) => (
              <div 
                class="bg-white dark:bg-stone-800 rounded-lg shadow-sm border border-gray-200 dark:border-stone-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/cookbooks/${cookbook.id}`)}
              >
                <div class="flex items-start justify-between mb-2">
                  <h3 class="font-medium text-gray-900 dark:text-stone-100 text-sm line-clamp-2">{cookbook.title}</h3>
                  <span class={`px-2 py-1 text-xs rounded-full ${
                    cookbook.userRole === 'owner' ? 'bg-purple-100 text-purple-800' :
                    cookbook.userRole === 'editor' ? 'bg-blue-100 text-blue-800' :
                    cookbook.userRole === 'contributor' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {cookbook.userRole}
                  </span>
                </div>
                <Show when={cookbook.description}>
                  <p class="text-gray-600 dark:text-stone-400 text-xs line-clamp-2 mb-2">{cookbook.description}</p>
                </Show>
                <p class="text-gray-400 dark:text-stone-500 text-xs">
                  Updated {new Date(cookbook.updatedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

// Recent Grocery Lists Section  
export function RecentGroceryLists() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Fetch recent grocery lists when user becomes available
  const [recentGroceryLists] = createResource(
    () => !!user(), // Fetch when user becomes available
    async () => {
      if (!user()) {
        throw new Error('User not authenticated');
      }
      const data = await api.getGroceryLists();
      // Sort by updatedAt desc and take first 5
      return data.groceryLists
        .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);
    }
  );

  return (
    <div class="mt-12 mb-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900">Recent Grocery Lists</h2>
        <a
          href="/grocery-lists"
          class="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
        >
          View all →
        </a>
      </div>
      
      <Show when={recentGroceryLists() && recentGroceryLists()!.length === 0}>
        <div class="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div class="text-gray-400 text-4xl mb-2">🛒</div>
          <p class="text-gray-600">No grocery lists yet</p>
          <a
            href="/grocery-lists"
            class="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
          >
            Create your first list
          </a>
        </div>
      </Show>
      
      <Show when={recentGroceryLists() && recentGroceryLists()!.length > 0}>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <For each={recentGroceryLists()}>
            {(list: any) => (
              <div 
                class="bg-white dark:bg-stone-800 rounded-lg shadow-sm border border-gray-200 dark:border-stone-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/grocery-lists/${list.id}`)}
              >
                <h3 class="font-medium text-gray-900 dark:text-stone-100 text-sm line-clamp-2 mb-2">{list.name}</h3>
                <Show when={list.description}>
                  <p class="text-gray-600 dark:text-stone-400 text-xs line-clamp-2 mb-2">{list.description}</p>
                </Show>
                <p class="text-gray-400 dark:text-stone-500 text-xs">
                  Updated {new Date(list.updatedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}