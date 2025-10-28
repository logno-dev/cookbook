import { Title } from "@solidjs/meta";
import { Show, createSignal, createResource, For, createEffect } from "solid-js";
import { useAuth } from "~/lib/auth-context";
import { useNavigate } from "@solidjs/router";
import PageLayout from "~/components/PageLayout";


interface RecipeIngredient {
  quantity?: string;
  unit?: string;
  ingredient: string;
  notes?: string;
}

interface RecipeInstruction {
  step: number;
  instruction: string;
  time?: number;
  temperature?: string;
}

interface Recipe {
  id: string;
  title: string;
  description?: string;
  ingredients: RecipeIngredient[];
  instructions: RecipeInstruction[];
  servings?: number;
  yield?: string;
  cookTime?: number;
  prepTime?: number;
  totalTime?: number;
  restTime?: number;
  difficulty?: string;
  cuisine?: string;
  category?: string;
  diet?: string;
  imageUrl?: string;
  sourceUrl?: string;
  sourceAuthor?: string;
  equipment?: string[];
  notes?: string;
  nutrition?: {
    calories?: number;
    protein?: string;
    carbohydrates?: string;
    fat?: string;
    saturatedFat?: string;
    cholesterol?: string;
    sodium?: string;
    fiber?: string;
    sugar?: string;
    servingSize?: string;
    servingsPerContainer?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

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

interface GroceryList {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  
  const [searchQuery, setSearchQuery] = createSignal("");
  const [selectedTags, setSelectedTags] = createSignal<string[]>([]);
  const [sortBy, setSortBy] = createSignal("createdAt");
  const [sortOrder, setSortOrder] = createSignal("desc");
  const [showAddRecipe, setShowAddRecipe] = createSignal(false);
  const [scrapeUrl, setScrapeUrl] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal("");



  // Handle redirect when user is not logged in
  createEffect(() => {
    if (!user()) {
      navigate("/login", { replace: true });
    }
  });

  if (!user()) {
    return (
      <main class="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <p class="mt-2 text-gray-600">Redirecting to login...</p>
        </div>
      </main>
    );
  }

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (searchQuery()) params.append("query", searchQuery());
    if (selectedTags().length > 0) params.append("tags", selectedTags().join(","));
    params.append("sortBy", sortBy());
    params.append("sortOrder", sortOrder());
    return params.toString();
  };

  const [recipes, { refetch: refetchRecipes }] = createResource(() => buildQuery(), async (queryString) => {
    const response = await fetch(`/api/recipes?${queryString}`);
    if (!response.ok) throw new Error("Failed to fetch recipes");
    const data = await response.json();
    return data.recipes as Recipe[];
  });

  const [tags] = createResource(async () => {
    const response = await fetch("/api/tags");
    if (!response.ok) throw new Error("Failed to fetch tags");
    const data = await response.json();
    return data.tags as Tag[];
  });

  // Fetch recent cookbooks (limit to 5 on frontend)
  const [recentCookbooks] = createResource(async () => {
    const response = await fetch("/api/cookbooks");
    if (!response.ok) throw new Error("Failed to fetch recent cookbooks");
    const data = await response.json();
    // Sort by updatedAt desc and take first 5
    return (data.cookbooks as Cookbook[])
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  });

  // Fetch recent grocery lists (limit to 5 on frontend)
  const [recentGroceryLists] = createResource(async () => {
    const response = await fetch("/api/grocery-lists");
    if (!response.ok) throw new Error("Failed to fetch recent grocery lists");
    const data = await response.json();
    // Sort by updatedAt desc and take first 5
    return (data.groceryLists as GroceryList[])
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  });

  const handleScrapeRecipe = async () => {
    if (!scrapeUrl()) return;
    
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/recipes/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scrapeUrl() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to scrape recipe");
      }

      const data = await response.json();
      
      const createResponse = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.recipe),
      });

      if (!createResponse.ok) {
        throw new Error("Failed to save recipe");
      }

      setScrapeUrl("");
      setShowAddRecipe(false);
      refetchRecipes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTag = (tagId: string) => {
    const current = selectedTags();
    if (current.includes(tagId)) {
      setSelectedTags(current.filter(id => id !== tagId));
    } else {
      setSelectedTags([...current, tagId]);
    }
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return "";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ""}`.trim();
    }
    return `${mins}m`;
  };

  const headerActions = () => (
    <div class="flex flex-col sm:flex-row gap-2">
      <select
        value={sortBy()}
        onChange={(e) => setSortBy(e.currentTarget.value)}
        class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="createdAt">Sort by Date</option>
        <option value="title">Sort by Title</option>
        <option value="cookTime">Sort by Cook Time</option>
      </select>
      
      <select
        value={sortOrder()}
        onChange={(e) => setSortOrder(e.currentTarget.value)}
        class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="desc">Descending</option>
        <option value="asc">Ascending</option>
      </select>
      
      {/* Desktop Add Recipe Button */}
      <button
        onClick={() => setShowAddRecipe(true)}
        class="hidden lg:flex px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 whitespace-nowrap"
      >
        Add Recipe
      </button>
    </div>
  );

  return (
    <>
      <Title>Dashboard - Recipe Curator</Title>
      <PageLayout
        title="Dashboard"
        headerActions={headerActions()}
      >
        {/* Search Bar */}
        <div class="mb-6">
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Tags Filter */}
        <Show when={tags()}>
          <div class="mb-6">
            <h3 class="text-sm font-medium text-gray-700 mb-2">Filter by tags:</h3>
            <div class="flex flex-wrap gap-2">
              <For each={tags()}>
                {(tag) => (
                  <button
                    onClick={() => toggleTag(tag.id)}
                    class={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedTags().includes(tag.id)
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    style={{ "background-color": selectedTags().includes(tag.id) ? tag.color : undefined }}
                  >
                    {tag.name}
                  </button>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Main Recipes Section */}
        <div class="mb-4">
          <h2 class="text-xl font-semibold text-gray-900">My Recipes</h2>
        </div>

        <Show when={recipes.loading}>
          <div class="flex justify-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        </Show>

        <Show when={recipes.error}>
          <div class="text-center py-8">
            <p class="text-red-600">Error loading recipes: {recipes.error.message}</p>
          </div>
        </Show>

        <Show when={recipes() && recipes()!.length === 0}>
          <div class="text-center py-12">
            <div class="text-gray-400 text-6xl mb-4">🍽️</div>
            <h3 class="text-xl font-medium text-gray-900 mb-2">No recipes yet</h3>
            <p class="text-gray-600 mb-4">Start building your recipe collection!</p>
            <button
              onClick={() => setShowAddRecipe(true)}
              class="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              Add Your First Recipe
            </button>
          </div>
        </Show>

        <Show when={recipes() && recipes()!.length > 0}>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <For each={recipes()}>
              {(recipe) => (
                <div 
                  class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
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
                    <h3 class="text-xl font-semibold text-gray-900 mb-2">{recipe.title}</h3>
                    
                    <Show when={recipe.description}>
                      <p class="text-gray-600 mb-3 line-clamp-2">{recipe.description}</p>
                    </Show>

                    <div class="flex flex-wrap gap-2 mb-3">
                      <Show when={recipe.cookTime}>
                        <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          🕐 {formatTime(recipe.cookTime)}
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
                          class="text-gray-500 hover:text-gray-700 text-sm"
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

         {/* Recent Grocery Lists Section */}
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
           
           <Show when={recentGroceryLists.loading}>
             <div class="flex justify-center py-4">
               <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
             </div>
           </Show>
           
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
                 {(list) => (
                   <div 
                     class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                     onClick={() => navigate(`/grocery-lists/${list.id}`)}
                   >
                     <h3 class="font-medium text-gray-900 text-sm line-clamp-2 mb-2">{list.name}</h3>
                     <Show when={list.description}>
                       <p class="text-gray-600 text-xs line-clamp-2 mb-2">{list.description}</p>
                     </Show>
                     <p class="text-gray-400 text-xs">
                       Updated {new Date(list.updatedAt).toLocaleDateString()}
                     </p>
                   </div>
                 )}
               </For>
             </div>
           </Show>
         </div>

         {/* Recent Cookbooks Section */}
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
           
           <Show when={recentCookbooks.loading}>
             <div class="flex justify-center py-4">
               <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
             </div>
           </Show>
           
           <Show when={recentCookbooks() && recentCookbooks()!.length === 0}>
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
           
           <Show when={recentCookbooks() && recentCookbooks()!.length > 0}>
             <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
               <For each={recentCookbooks()}>
                 {(cookbook) => (
                   <div 
                     class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                     onClick={() => navigate(`/cookbooks/${cookbook.id}`)}
                   >
                     <div class="flex items-start justify-between mb-2">
                       <h3 class="font-medium text-gray-900 text-sm line-clamp-2">{cookbook.title}</h3>
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
                       <p class="text-gray-600 text-xs line-clamp-2 mb-2">{cookbook.description}</p>
                     </Show>
                     <p class="text-gray-400 text-xs">
                       Updated {new Date(cookbook.updatedAt).toLocaleDateString()}
                     </p>
                   </div>
                 )}
               </For>
             </div>
           </Show>
         </div>
      </PageLayout>

      <Show when={showAddRecipe()}>
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-4">Add Recipe</h2>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Recipe URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/recipe"
                  value={scrapeUrl()}
                  onInput={(e) => setScrapeUrl(e.currentTarget.value)}
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p class="text-xs text-gray-500 mt-1">
                  Paste a URL from a recipe website to automatically extract the recipe
                </p>
              </div>

              <Show when={error()}>
                <div class="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {error()}
                </div>
              </Show>

              <div class="flex gap-3 pt-4">
                <button
                  onClick={handleScrapeRecipe}
                  disabled={!scrapeUrl() || isLoading()}
                  class="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading() ? "Importing..." : "Import Recipe"}
                </button>
                
                <button
                  onClick={() => navigate("/recipe/new")}
                  class="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Create Manual
                </button>
                
                <button
                  onClick={() => {
                    setShowAddRecipe(false);
                    setScrapeUrl("");
                    setError("");
                  }}
                  class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Mobile Floating Action Button */}
      <button
        onClick={() => setShowAddRecipe(true)}
        class="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 z-40 flex items-center justify-center transition-all duration-200 hover:scale-105"
        aria-label="Add Recipe"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </>
  );
}