import { Title } from "@solidjs/meta";
import { Show, createSignal, createEffect, onMount } from "solid-js";
import { useAuth } from "~/lib/auth-context";
import { useNavigate } from "@solidjs/router";
import PageLayout from "~/components/PageLayout";
import { SkeletonDashboard, SkeletonCardGrid, SkeletonFilters } from "~/components/Skeletons";
import { SearchAndFilters, RecipesGrid, RecentCookbooks, RecentGroceryLists } from "~/components/DashboardSections";
import { useFilteredRecipes } from "~/lib/stores";
import { api } from "~/lib/api-client";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = createSignal(false);
  
  const [searchQuery, setSearchQuery] = createSignal("");
  const [selectedTags, setSelectedTags] = createSignal<string[]>([]);
  const [sortBy, setSortBy] = createSignal("createdAt");
  const [sortOrder, setSortOrder] = createSignal("desc");
  const [showAddRecipe, setShowAddRecipe] = createSignal(false);
  const [scrapeUrl, setScrapeUrl] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  // Ensure client-side only rendering for store-dependent components
  onMount(() => {
    setMounted(true);
  });

  // Non-blocking auth redirect
  createEffect(() => {
    if (!authLoading() && !user()) {
      navigate("/login", { replace: true });
    }
  });

  // Always call stores - let them handle SSR safety internally
  const filteredRecipes = useFilteredRecipes(searchQuery, selectedTags, sortBy, sortOrder);

  const handleScrapeRecipe = async () => {
    if (!scrapeUrl()) return;
    
    setIsLoading(true);
    setError("");

    try {
      const scrapeData = await api.call("/api/recipes/scrape", {
        method: "POST",
        body: JSON.stringify({ url: scrapeUrl() }),
      });
      
      await api.call("/api/recipes", {
        method: "POST",
        body: JSON.stringify(scrapeData.recipe),
      });

      setScrapeUrl("");
      setShowAddRecipe(false);
      // Trigger a simple page refresh to update recipes
      window.location.reload();
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
        class="px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100"
      >
        <option value="createdAt">Sort by Date</option>
        <option value="title">Sort by Title</option>
        <option value="cookTime">Sort by Cook Time</option>
      </select>
      
      <select
        value={sortOrder()}
        onChange={(e) => setSortOrder(e.currentTarget.value)}
        class="px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100"
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
      {/* Show skeleton while auth is loading or not mounted */}
      {authLoading() || !user() || !mounted() ? (
        <main class="min-h-screen bg-gray-50 pt-16">
          <div class="max-w-7xl mx-auto px-4 py-8">
            <SkeletonDashboard />
          </div>
        </main>
      ) : (
        <PageLayout
          title="Dashboard"
          headerActions={headerActions()}
        >
          {/* Search and Filters */}
          <SearchAndFilters 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedTags={selectedTags}
            toggleTag={toggleTag}
          />

          {/* Main Recipes Grid */}
          <RecipesGrid 
            filteredRecipes={filteredRecipes}
            formatTime={formatTime}
            showAddRecipe={showAddRecipe}
            setShowAddRecipe={setShowAddRecipe}
          />

          {/* Recent Grocery Lists */}
          <RecentGroceryLists />

          {/* Recent Cookbooks */}
          <RecentCookbooks />
        </PageLayout>
      )}

      {/* Add Recipe Modal */}
      <Show when={showAddRecipe()}>
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white dark:bg-stone-800 rounded-lg shadow-xl max-w-md w-full p-6">
             <h2 class="text-2xl font-bold text-gray-900 dark:text-stone-100 mb-4">Add Recipe</h2>
            
            <div class="space-y-4">
              <div>
                 <label class="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
                   Recipe URL
                 </label>
                <input
                  type="url"
                  placeholder="https://example.com/recipe"
                  value={scrapeUrl()}
                  onInput={(e) => setScrapeUrl(e.currentTarget.value)}
                  class="w-full px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder:text-gray-500 dark:placeholder:text-stone-400"
                />
                <p class="text-xs text-gray-500 dark:text-stone-400 mt-1">
                  Paste a URL from a recipe website to automatically extract the recipe
                </p>
              </div>

               <Show when={error()}>
                 <div class="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
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
                  class="px-4 py-2 bg-white dark:bg-stone-700 border border-gray-300 dark:border-stone-600 text-gray-700 dark:text-stone-100 rounded-lg hover:bg-gray-50 dark:hover:bg-stone-600 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-stone-400"
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