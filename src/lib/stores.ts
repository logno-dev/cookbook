import { createSignal, createEffect, createMemo } from 'solid-js';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  ingredients: Array<{
    quantity?: string;
    unit?: string;
    ingredient: string;
    notes?: string;
  }>;
  instructions: Array<{
    step: number;
    instruction: string;
    time?: number;
    temperature?: string;
  }>;
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
  tags: Tag[];
}

export interface Cookbook {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  members: Array<{
    id: string;
    userId: string;
    role: 'owner' | 'editor' | 'contributor' | 'reader';
    joinedAt: string;
    user: {
      id: string;
      email: string;
      name?: string;
    };
  }>;
  userRole: 'owner' | 'editor' | 'contributor' | 'reader';
}

// Cache duration in milliseconds
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class Store<T> {
  private dataSignal = createSignal<T | null>(null);
  private loadingSignal = createSignal(false);
  private errorSignal = createSignal<string | null>(null);
  private lastFetchSignal = createSignal<number>(0);
  
  private data = this.dataSignal[0];
  private setData = this.dataSignal[1];
  private loading = this.loadingSignal[0];
  private setLoading = this.loadingSignal[1];
  private error = this.errorSignal[0];
  private setError = this.errorSignal[1];
  private lastFetch = this.lastFetchSignal[0];
  private setLastFetch = this.lastFetchSignal[1];
  
  constructor(
    private fetchFn: () => Promise<T>,
    private cacheKey: string,
    private cacheDuration: number = CACHE_DURATION
  ) {}

  // Get cached data from sessionStorage
  private getCached(): T | null {
    try {
      const cached = sessionStorage.getItem(this.cacheKey);
      if (cached) {
        const entry: CacheEntry<T> = JSON.parse(cached);
        if (Date.now() - entry.timestamp < this.cacheDuration) {
          return entry.data;
        }
      }
    } catch (error) {
      console.warn(`Failed to read cache for ${this.cacheKey}:`, error);
    }
    return null;
  }

  // Set cached data in sessionStorage
  private setCached(data: T) {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now()
      };
      sessionStorage.setItem(this.cacheKey, JSON.stringify(entry));
    } catch (error) {
      console.warn(`Failed to cache data for ${this.cacheKey}:`, error);
    }
  }

  // Clear cache
  private clearCache() {
    try {
      sessionStorage.removeItem(this.cacheKey);
    } catch (error) {
      console.warn(`Failed to clear cache for ${this.cacheKey}:`, error);
    }
  }

  // Fetch data with caching logic
  async fetch(forceRefresh = false): Promise<T | null> {
    if (!forceRefresh) {
      // Check if we have recent cached data
      const cached = this.getCached();
      if (cached) {
        this.setData(cached);
        return cached;
      }

      // Check if we have in-memory data that's still fresh
      const currentData = this.data();
      const timeSinceLastFetch = Date.now() - this.lastFetch();
      if (currentData && timeSinceLastFetch < this.cacheDuration) {
        return currentData;
      }
    }

    // Prevent multiple simultaneous requests
    if (this.loading()) {
      return this.data();
    }

    this.setLoading(true);
    this.setError(null);

    try {
      const result = await this.fetchFn();
      this.setData(result);
      this.setCached(result);
      this.setLastFetch(Date.now());
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      this.setError(errorMessage);
      console.error(`Error fetching ${this.cacheKey}:`, err);
      return null;
    } finally {
      this.setLoading(false);
    }
  }

  // Invalidate and refetch
  async invalidate(): Promise<T | null> {
    this.clearCache();
    this.setLastFetch(0);
    return this.fetch(true);
  }

  // Update data optimistically
  update(updater: (current: T | null) => T | null) {
    const current = this.data();
    const updated = updater(current);
    this.setData(updated);
    if (updated) {
      this.setCached(updated);
    } else {
      this.clearCache();
    }
  }

  // Getters
  getData() { return this.data; }
  getLoading() { return this.loading; }
  getError() { return this.error; }
}

// Global stores
export const tagsStore = new Store<Tag[]>(
  async () => {
    const response = await fetch('/api/tags');
    if (!response.ok) throw new Error('Failed to fetch tags');
    const data = await response.json();
    return data.tags;
  },
  'tags_cache'
);

export const recipesStore = new Store<Recipe[]>(
  async () => {
    const response = await fetch('/api/recipes');
    if (!response.ok) throw new Error('Failed to fetch recipes');
    const data = await response.json();
    return data.recipes;
  },
  'recipes_cache'
);

export const cookbooksStore = new Store<Cookbook[]>(
  async () => {
    const response = await fetch('/api/cookbooks');
    if (!response.ok) throw new Error('Failed to fetch cookbooks');
    const data = await response.json();
    return data.cookbooks;
  },
  'cookbooks_cache'
);

// Helper functions for common operations
export const useTags = () => {
  createEffect(() => {
    // Auto-fetch tags when the component mounts
    tagsStore.fetch();
  });

  return {
    data: tagsStore.getData(),
    loading: tagsStore.getLoading(),
    error: tagsStore.getError(),
    refetch: () => tagsStore.fetch(true),
    invalidate: () => tagsStore.invalidate()
  };
};

export const useRecipes = () => {
  createEffect(() => {
    // Auto-fetch recipes when the component mounts
    recipesStore.fetch();
  });

  return {
    data: recipesStore.getData(),
    loading: recipesStore.getLoading(),
    error: recipesStore.getError(),
    refetch: () => recipesStore.fetch(true),
    invalidate: () => recipesStore.invalidate(),
    // Optimistic updates for common operations
    addRecipe: (recipe: Recipe) => {
      recipesStore.update(current => current ? [...current, recipe] : [recipe]);
    },
    updateRecipe: (recipeId: string, updates: Partial<Recipe>) => {
      recipesStore.update(current => 
        current ? current.map(r => r.id === recipeId ? { ...r, ...updates } : r) : null
      );
    },
    removeRecipe: (recipeId: string) => {
      recipesStore.update(current => 
        current ? current.filter(r => r.id !== recipeId) : null
      );
    }
  };
};

export const useCookbooks = () => {
  createEffect(() => {
    // Auto-fetch cookbooks when the component mounts
    cookbooksStore.fetch();
  });

  return {
    data: cookbooksStore.getData(),
    loading: cookbooksStore.getLoading(),
    error: cookbooksStore.getError(),
    refetch: () => cookbooksStore.fetch(true),
    invalidate: () => cookbooksStore.invalidate(),
    // Optimistic updates for common operations
    addCookbook: (cookbook: Cookbook) => {
      cookbooksStore.update(current => current ? [...current, cookbook] : [cookbook]);
    },
    updateCookbook: (cookbookId: string, updates: Partial<Cookbook>) => {
      cookbooksStore.update(current => 
        current ? current.map(c => c.id === cookbookId ? { ...c, ...updates } : c) : null
      );
    },
    removeCookbook: (cookbookId: string) => {
      cookbooksStore.update(current => 
        current ? current.filter(c => c.id !== cookbookId) : null
      );
    }
  };
};

// Filtered and sorted data helpers with memoization
export const useFilteredRecipes = (
  searchQuery: () => string,
  selectedTags: () => string[],
  sortBy: () => string,
  sortOrder: () => string
) => {
  const recipesStore = useRecipes();

  return createMemo(() => {
    const recipeList = recipesStore.data();
    if (!recipeList) return [];

    let filtered = recipeList;

    // Apply search filter
    const query = searchQuery().toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(recipe => 
        recipe.title.toLowerCase().includes(query) ||
        recipe.description?.toLowerCase().includes(query) ||
        recipe.ingredients.some(ing => ing.ingredient.toLowerCase().includes(query)) ||
        recipe.tags.some(tag => tag.name.toLowerCase().includes(query))
      );
    }

    // Apply tag filter
    const tags = selectedTags();
    if (tags.length > 0) {
      filtered = filtered.filter(recipe => 
        recipe.tags.some(tag => tags.includes(tag.id))
      );
    }

    // Apply sorting
    const sort = sortBy();
    const order = sortOrder();
    
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sort) {
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'cookTime':
          aVal = a.cookTime || 0;
          bVal = b.cookTime || 0;
          break;
        case 'createdAt':
        default:
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
      }

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  });
};