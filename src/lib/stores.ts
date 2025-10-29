import { createSignal, createEffect, createMemo, createResource } from 'solid-js';
import { useAuth } from './auth-context';
import { api } from './api-client';

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



// Simple cached resource functions
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes - increased for better performance

function createCachedResource<T>(
  fetchFn: () => Promise<T>,
  cacheKey: string,
  deps?: () => any
) {
  return createResource(deps, async () => {
    // Only run on client side to avoid SSR issues
    if (typeof window === 'undefined') {
      return null;
    }
    
    // Check cache first
    try {
      const cached = sessionStorage.getItem(cacheKey);
      const expiry = sessionStorage.getItem(`${cacheKey}_expiry`);
      
      if (cached && expiry && Date.now() < parseInt(expiry)) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Failed to read cache:', error);
    }

    // Fetch from server with absolute URL handling
    const result = await fetchFn();
    
    // Cache the result
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
      sessionStorage.setItem(`${cacheKey}_expiry`, (Date.now() + CACHE_DURATION).toString());
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }

    return result;
  });
}

export const useTags = () => {
  const { user } = useAuth();
  
  const [tags, { refetch }] = createCachedResource(
    async () => {
      // Check if user is authenticated
      if (!user()) {
        throw new Error('User not authenticated');
      }
      const data = await api.getTags();
      return data.tags as Tag[];
    },
    'tags_cache',
    () => !!user() // Fetch when user becomes available
  );

  return {
    data: tags,
    loading: () => tags.loading,
    error: () => tags.error?.message || null,
    refetch,
    invalidate: () => {
      try {
        sessionStorage.removeItem('tags_cache');
        sessionStorage.removeItem('tags_cache_expiry');
      } catch (error) {
        console.warn('Failed to clear cache:', error);
      }
      return refetch();
    }
  };
};

export const useRecipes = () => {
  const { user } = useAuth();
  
  const [recipes, { refetch }] = createCachedResource(
    async () => {
      // Check if user is authenticated
      if (!user()) {
        throw new Error('User not authenticated');
      }
      const data = await api.getRecipes();
      return data.recipes as Recipe[];
    },
    'recipes_cache',
    () => !!user() // Fetch when user becomes available
  );

  return {
    data: recipes,
    loading: () => recipes.loading,
    error: () => recipes.error?.message || null,
    refetch,
    invalidate: () => {
      try {
        sessionStorage.removeItem('recipes_cache');
        sessionStorage.removeItem('recipes_cache_expiry');
      } catch (error) {
        console.warn('Failed to clear cache:', error);
      }
      return refetch();
    }
  };
};

export const useCookbooks = () => {
  const { user } = useAuth();
  
  const [cookbooks, { refetch }] = createCachedResource(
    async () => {
      // Check if user is authenticated
      if (!user()) {
        throw new Error('User not authenticated');
      }
      const data = await api.getCookbooks();
      return data.cookbooks as Cookbook[];
    },
    'cookbooks_cache',
    () => !!user() // Fetch when user becomes available
  );

  return {
    data: cookbooks,
    loading: () => cookbooks.loading,
    error: () => cookbooks.error?.message || null,
    refetch,
    invalidate: () => {
      try {
        sessionStorage.removeItem('cookbooks_cache');
        sessionStorage.removeItem('cookbooks_cache_expiry');
      } catch (error) {
        console.warn('Failed to clear cache:', error);
      }
      return refetch();
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
  const { data: recipes } = useRecipes();

  return createMemo(() => {
    const recipeList = recipes();
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