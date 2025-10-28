import { createSignal, For, Show, createEffect, createMemo } from 'solid-js';

interface RecipeIngredient {
  quantity?: string;
  unit?: string;
  ingredient: string;
  notes?: string;
}

interface Recipe {
  id: string;
  title: string;
  description?: string;
  ingredients: RecipeIngredient[];
  cookbookId?: string;
  imageUrl?: string;
  cookTime?: number;
  prepTime?: number;
  difficulty?: string;
  cuisine?: string;
}

interface RecipeVariant {
  id: string;
  recipeId: string;
  name: string;
  description?: string;
  ingredients?: RecipeIngredient[];
}

interface RecipeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (recipeId: string, variantId?: string, multiplier?: number) => void;
  onSelectMultiple?: (selections: Array<{ recipeId: string; variantId?: string; multiplier?: number }>) => void;
  isLoading?: boolean;
  existingRecipeIds?: Set<string>;
  enableMultiSelect?: boolean;
}

export default function RecipeSelectorModal(props: RecipeSelectorModalProps) {
  const [searchQuery, setSearchQuery] = createSignal('');
  const [searchResults, setSearchResults] = createSignal<Recipe[]>([]);
  const [isSearching, setIsSearching] = createSignal(false);
  const [selectedRecipe, setSelectedRecipe] = createSignal<Recipe | null>(null);
  const [recipeVariants, setRecipeVariants] = createSignal<RecipeVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = createSignal<string | null>(null);
  const [selectedMultiplier, setSelectedMultiplier] = createSignal(1);
  const [isLoadingVariants, setIsLoadingVariants] = createSignal(false);
  
  // Multi-select state
  const [selectedRecipes, setSelectedRecipes] = createSignal<Set<string>>(new Set());
  const [recipeConfigs, setRecipeConfigs] = createSignal<Map<string, { variantId?: string; multiplier: number }>>(new Map());
  const [recipeVariantsMap, setRecipeVariantsMap] = createSignal<Map<string, RecipeVariant[]>>(new Map());

  // Debounced search
  let searchTimeout: NodeJS.Timeout;
  createEffect(() => {
    const query = searchQuery();
    clearTimeout(searchTimeout);
    
    if (query.length >= 2) {
      searchTimeout = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else if (query.length === 0) {
      // Load all recipes when search is empty
      performSearch('');
    } else {
      setSearchResults([]);
    }
  });

  const performSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const searchParams = new URLSearchParams();
      if (query) {
        searchParams.append('query', query);
      }
      
      const response = await fetch(`/api/recipes?${searchParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.recipes || []);
      } else {
        console.error('Failed to search recipes');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching recipes:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const loadRecipeVariants = async (recipeId: string) => {
    setIsLoadingVariants(true);
    try {
      const response = await fetch(`/api/recipes/${recipeId}/variants`);
      if (response.ok) {
        const data = await response.json();
        setRecipeVariants(data.variants || []);
      } else {
        setRecipeVariants([]);
      }
    } catch (error) {
      console.error('Error loading recipe variants:', error);
      setRecipeVariants([]);
    } finally {
      setIsLoadingVariants(false);
    }
  };

  const loadRecipeVariantsForMultiSelect = async (recipeId: string) => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/variants`);
      if (response.ok) {
        const data = await response.json();
        const variantsMap = new Map(recipeVariantsMap());
        variantsMap.set(recipeId, data.variants || []);
        setRecipeVariantsMap(variantsMap);
      }
    } catch (error) {
      console.error('Error loading recipe variants for multi-select:', error);
    }
  };

  const handleRecipeSelect = (recipe: Recipe) => {
    if (props.enableMultiSelect) {
      // In multi-select mode, toggle recipe selection
      const selected = selectedRecipes();
      const newSelected = new Set(selected);
      
      if (selected.has(recipe.id)) {
        newSelected.delete(recipe.id);
        const configs = new Map(recipeConfigs());
        configs.delete(recipe.id);
        setRecipeConfigs(configs);
        // Remove variants from map when deselecting
        const variantsMap = new Map(recipeVariantsMap());
        variantsMap.delete(recipe.id);
        setRecipeVariantsMap(variantsMap);
      } else {
        newSelected.add(recipe.id);
        const configs = new Map(recipeConfigs());
        configs.set(recipe.id, { multiplier: 1 });
        setRecipeConfigs(configs);
        // Load variants for this recipe
        loadRecipeVariantsForMultiSelect(recipe.id);
      }
      
      setSelectedRecipes(newSelected);
    } else {
      // Single-select mode - go to recipe details
      setSelectedRecipe(recipe);
      setSelectedVariantId(null);
      setSelectedMultiplier(1);
      loadRecipeVariants(recipe.id);
    }
  };

  const handleBackToSearch = () => {
    setSelectedRecipe(null);
    setRecipeVariants([]);
    setSelectedVariantId(null);
    setSelectedMultiplier(1);
  };

  const handleConfirm = () => {
    if (props.enableMultiSelect) {
      // Multi-select mode - call onSelectMultiple
      const selections = Array.from(selectedRecipes()).map(recipeId => {
        const config = recipeConfigs().get(recipeId) || { multiplier: 1 };
        return {
          recipeId,
          variantId: config.variantId,
          multiplier: config.multiplier
        };
      });
      props.onSelectMultiple?.(selections);
    } else {
      // Single-select mode - call onSelect
      const recipe = selectedRecipe();
      if (!recipe) return;
      props.onSelect?.(recipe.id, selectedVariantId() || undefined, selectedMultiplier());
    }
  };

  const updateRecipeConfig = (recipeId: string, variantId?: string, multiplier?: number) => {
    const configs = new Map(recipeConfigs());
    const existing = configs.get(recipeId) || { multiplier: 1 };
    configs.set(recipeId, {
      variantId: variantId !== undefined ? variantId : existing.variantId,
      multiplier: multiplier !== undefined ? multiplier : existing.multiplier
    });
    setRecipeConfigs(configs);
  };

  const currentIngredients = createMemo(() => {
    const recipe = selectedRecipe();
    if (!recipe) return [];
    
    const variant = recipeVariants().find(v => v.id === selectedVariantId());
    if (variant && variant.ingredients) {
      // Merge variant ingredients with base recipe ingredients
      return recipe.ingredients.map((baseIngredient, index) => {
        const variantIngredient = variant.ingredients?.[index];
        if (variantIngredient && variantIngredient.ingredient && variantIngredient.ingredient.trim()) {
          return variantIngredient;
        }
        return baseIngredient;
      });
    }
    
    return recipe.ingredients;
  });

  // Initialize search on modal open
  createEffect(() => {
    if (props.isOpen && searchResults().length === 0 && !isSearching()) {
      performSearch('');
    }
  });

  // Reset state when modal closes
  createEffect(() => {
    if (!props.isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedRecipe(null);
      setRecipeVariants([]);
      setSelectedVariantId(null);
      setSelectedMultiplier(1);
      setSelectedRecipes(new Set());
      setRecipeConfigs(new Map());
      setRecipeVariantsMap(new Map());
    }
  });

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div class="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 class="text-xl font-semibold text-gray-900">
              {selectedRecipe() 
                ? 'Recipe Details' 
                : props.enableMultiSelect 
                  ? 'Select Recipes' 
                  : 'Select Recipe'}
            </h3>
            <button
              onClick={props.onClose}
              class="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div class="flex-1 overflow-hidden">
            <Show 
              when={!selectedRecipe()}
              fallback={
                /* Recipe Details View */
                <div class="p-6 h-full overflow-y-auto">
                  <div class="space-y-6">
                    {/* Back Button and Recipe Info */}
                    <div class="flex items-center gap-4">
                      <button
                        onClick={handleBackToSearch}
                        class="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                      >
                        ← Back to Search
                      </button>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Recipe Info */}
                      <div class="space-y-4">
                        <div>
                          <h4 class="text-2xl font-bold text-gray-900 mb-2">
                            {selectedRecipe()?.title}
                          </h4>
                          <Show when={selectedRecipe()?.description}>
                            <p class="text-gray-600">{selectedRecipe()?.description}</p>
                          </Show>
                        </div>

                        <Show when={selectedRecipe()?.imageUrl}>
                          <img
                            src={selectedRecipe()?.imageUrl}
                            alt={selectedRecipe()?.title}
                            class="w-full h-48 object-cover rounded-lg"
                          />
                        </Show>

                        {/* Recipe Meta */}
                        <div class="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <Show when={selectedRecipe()?.cookTime}>
                            <div>
                              <span class="font-medium">Cook Time:</span> {selectedRecipe()?.cookTime}m
                            </div>
                          </Show>
                          <Show when={selectedRecipe()?.prepTime}>
                            <div>
                              <span class="font-medium">Prep Time:</span> {selectedRecipe()?.prepTime}m
                            </div>
                          </Show>
                          <Show when={selectedRecipe()?.difficulty}>
                            <div>
                              <span class="font-medium">Difficulty:</span> {selectedRecipe()?.difficulty}
                            </div>
                          </Show>
                          <Show when={selectedRecipe()?.cuisine}>
                            <div>
                              <span class="font-medium">Cuisine:</span> {selectedRecipe()?.cuisine}
                            </div>
                          </Show>
                        </div>

                        {/* Variant Selection */}
                        <Show when={recipeVariants().length > 0}>
                          <div class="space-y-2">
                            <label class="block text-sm font-medium text-gray-700">
                              Recipe Variant
                            </label>
                            <select
                              value={selectedVariantId() || ''}
                              onChange={(e) => setSelectedVariantId(e.target.value || null)}
                              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Original Recipe</option>
                              <For each={recipeVariants()}>
                                {(variant) => (
                                  <option value={variant.id}>{variant.name}</option>
                                )}
                              </For>
                            </select>
                          </div>
                        </Show>

                        {/* Multiplier Selection */}
                        <div class="space-y-2">
                          <label class="block text-sm font-medium text-gray-700">
                            Recipe Size
                          </label>
                          <div class="flex items-center gap-1 border border-gray-300 rounded-lg overflow-hidden w-fit">
                            <For each={[1, 1.5, 2, 3]}>
                              {(multiplier) => (
                                <button
                                  onClick={() => setSelectedMultiplier(multiplier)}
                                  class={`px-4 py-2 text-sm font-medium transition-colors ${
                                    selectedMultiplier() === multiplier
                                      ? "bg-blue-600 text-white"
                                      : "bg-white text-gray-700 hover:bg-gray-50"
                                  }`}
                                >
                                  {multiplier}x
                                </button>
                              )}
                            </For>
                          </div>
                        </div>
                      </div>

                      {/* Ingredients Preview */}
                      <div class="space-y-4">
                        <h5 class="text-lg font-semibold text-gray-900">Ingredients</h5>
                        <Show 
                          when={!isLoadingVariants()}
                          fallback={
                            <div class="flex items-center justify-center py-8">
                              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              <span class="ml-2 text-gray-600">Loading variants...</span>
                            </div>
                          }
                        >
                          <div class="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto">
                            <ul class="space-y-2">
                              <For each={currentIngredients()}>
                                {(ingredient) => (
                                  <li class="text-sm text-gray-700">
                                    <span class="font-medium">
                                      {ingredient.quantity && `${ingredient.quantity} `}
                                      {ingredient.unit && `${ingredient.unit} `}
                                    </span>
                                    {ingredient.ingredient}
                                    {ingredient.notes && (
                                      <span class="text-gray-500 italic"> ({ingredient.notes})</span>
                                    )}
                                  </li>
                                )}
                              </For>
                            </ul>
                          </div>
                        </Show>
                      </div>
                    </div>
                  </div>
                </div>
              }
            >
              {/* Search View */}
              <div class="p-6 h-full flex flex-col">
                {/* Search Input */}
                <div class="mb-6">
                  <div class="relative">
                    <input
                      type="text"
                      placeholder="Search recipes..."
                      value={searchQuery()}
                      onInput={(e) => setSearchQuery(e.target.value)}
                      class="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autofocus
                    />
                    <Show when={isSearching()}>
                      <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      </div>
                    </Show>
                  </div>
                  <p class="text-sm text-gray-500 mt-2">
                    {searchQuery() ? `Search results for "${searchQuery()}"` : 'Showing all your recipes'}
                  </p>
                </div>

                {/* Multi-select controls */}
                <Show when={props.enableMultiSelect && searchResults().length > 0}>
                  <div class="mb-4 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                      <button
                        onClick={async () => {
                          const allRecipeIds = new Set(searchResults().map(r => r.id));
                          setSelectedRecipes(allRecipeIds);
                          const configs = new Map();
                          searchResults().forEach(recipe => {
                            configs.set(recipe.id, { multiplier: 1 });
                            // Load variants for each recipe
                            loadRecipeVariantsForMultiSelect(recipe.id);
                          });
                          setRecipeConfigs(configs);
                        }}
                        class="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRecipes(new Set());
                          setRecipeConfigs(new Map());
                          setRecipeVariantsMap(new Map());
                        }}
                        class="text-sm text-gray-600 hover:text-gray-800 font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                    <Show when={selectedRecipes().size > 0}>
                      <span class="text-sm text-gray-600">
                        {selectedRecipes().size} selected
                      </span>
                    </Show>
                  </div>
                </Show>

                {/* Search Results */}
                <div class="flex-1 overflow-y-auto">
                  <Show 
                    when={searchResults().length > 0}
                    fallback={
                      <div class="text-center py-12">
                        <Show 
                          when={!isSearching()}
                          fallback={
                            <div class="flex items-center justify-center">
                              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              <span class="ml-3 text-gray-600">Searching...</span>
                            </div>
                          }
                        >
                          <p class="text-gray-500">
                            {searchQuery() ? 'No recipes found matching your search.' : 'No recipes available.'}
                          </p>
                        </Show>
                      </div>
                    }
                  >
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <For each={searchResults()}>
                        {(recipe) => {
                          const isExisting = () => props.existingRecipeIds?.has(recipe.id) || false;
                          const isSelected = () => selectedRecipes().has(recipe.id);
                          
                          return (
                            <div
                              onClick={() => handleRecipeSelect(recipe)}
                              class={`border rounded-lg p-4 cursor-pointer transition-all relative ${
                                isSelected() 
                                  ? "border-blue-500 bg-blue-50 shadow-md" 
                                  : isExisting()
                                    ? "border-green-300 bg-green-50 hover:border-green-400"
                                    : "border-gray-200 hover:border-blue-300 hover:shadow-md"
                              }`}
                            >
                              {/* Existing recipe indicator */}
                              <Show when={isExisting()}>
                                <div class="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                                  Added
                                </div>
                              </Show>
                              
                              {/* Multi-select checkbox */}
                              <Show when={props.enableMultiSelect}>
                                <div class="absolute top-3 left-3 z-10">
                                  <input
                                    type="checkbox"
                                    checked={isSelected()}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={() => handleRecipeSelect(recipe)}
                                    class="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                  />
                                </div>
                              </Show>
                              
                              <div class={`${props.enableMultiSelect ? 'ml-6' : ''}`}>
                                <div class="flex gap-4">
                                  <Show 
                                    when={recipe.imageUrl}
                                    fallback={
                                      <div class="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <span class="text-gray-400 text-xl">🍳</span>
                                      </div>
                                    }
                                  >
                                    <img
                                      src={recipe.imageUrl}
                                      alt={recipe.title}
                                      class="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                    />
                                  </Show>
                                  
                                  <div class="flex-1 min-w-0">
                                    <h4 class="font-semibold text-gray-900 truncate">
                                      {recipe.title}
                                    </h4>
                                    <Show when={recipe.description}>
                                      <p class="text-sm text-gray-600 mt-1 line-clamp-2">
                                        {recipe.description}
                                      </p>
                                    </Show>
                                    
                                    <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                      <Show when={recipe.cookTime}>
                                        <span>🕒 {recipe.cookTime}m</span>
                                      </Show>
                                      <Show when={recipe.difficulty}>
                                        <span>📊 {recipe.difficulty}</span>
                                      </Show>
                                      <Show when={recipe.cuisine}>
                                        <span>🌍 {recipe.cuisine}</span>
                                      </Show>
                                    </div>
                                  </div>
                                </div>

                                {/* Variant and Multiplier Controls - Show when selected in multi-select mode */}
                                <Show when={props.enableMultiSelect && isSelected()}>
                                  <div class="mt-4 pt-4 border-t border-gray-200 space-y-3">
                                    {/* Variant Selection */}
                                    <Show when={recipeVariantsMap().get(recipe.id)?.length > 0}>
                                      <div>
                                        <label class="block text-xs font-medium text-gray-700 mb-1">
                                          Recipe Variant
                                        </label>
                                        <select
                                          value={recipeConfigs().get(recipe.id)?.variantId || ''}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            updateRecipeConfig(recipe.id, e.target.value || undefined);
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                          <option value="">Original Recipe</option>
                                          <For each={recipeVariantsMap().get(recipe.id) || []}>
                                            {(variant) => (
                                              <option value={variant.id}>{variant.name}</option>
                                            )}
                                          </For>
                                        </select>
                                      </div>
                                    </Show>

                                    {/* Multiplier Selection */}
                                    <div>
                                      <label class="block text-xs font-medium text-gray-700 mb-1">
                                        Recipe Size
                                      </label>
                                      <div class="flex items-center gap-1 border border-gray-300 rounded overflow-hidden w-fit">
                                        <For each={[1, 1.5, 2, 3]}>
                                          {(multiplier) => (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateRecipeConfig(recipe.id, undefined, multiplier);
                                              }}
                                              class={`px-3 py-1 text-xs font-medium transition-colors ${
                                                (recipeConfigs().get(recipe.id)?.multiplier || 1) === multiplier
                                                  ? "bg-blue-600 text-white"
                                                  : "bg-white text-gray-700 hover:bg-gray-50"
                                              }`}
                                            >
                                              {multiplier}x
                                            </button>
                                          )}
                                        </For>
                                      </div>
                                    </div>
                                  </div>
                                </Show>
                              </div>
                            </div>
                          );
                        }}
                      </For>
                    </div>
                  </Show>
                </div>
              </div>
            </Show>
          </div>

          {/* Footer - Show in recipe details view or multi-select mode */}
          <Show when={selectedRecipe() || (props.enableMultiSelect && selectedRecipes().size > 0)}>
            <div class="p-6 border-t border-gray-200 flex justify-between items-center gap-3">
              <Show when={props.enableMultiSelect && !selectedRecipe()}>
                <div class="text-sm text-gray-600">
                  {selectedRecipes().size} recipe{selectedRecipes().size !== 1 ? 's' : ''} selected
                </div>
              </Show>
              
              <div class="flex gap-3 ml-auto">
                <button
                  onClick={props.onClose}
                  class="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={props.isLoading}
                  class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {props.isLoading 
                    ? 'Adding...' 
                    : props.enableMultiSelect && !selectedRecipe()
                      ? `Add ${selectedRecipes().size} Recipe${selectedRecipes().size !== 1 ? 's' : ''}`
                      : 'Add to Grocery List'}
                </button>
              </div>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
}