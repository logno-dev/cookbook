import { createSignal, Show, For, createEffect, createMemo } from 'solid-js';
import { useAuth } from '../../lib/auth-context';
import { Navigate, useParams } from '@solidjs/router';
import { Title } from '@solidjs/meta';
import RecipeSelectorModal from '../../components/RecipeSelectorModal';
import PageLayout from '../../components/PageLayout';
import Breadcrumbs from '../../components/Breadcrumbs';

// Client-side function to format quantities as fractions
function formatQuantity(quantity?: string): string {
  if (!quantity || quantity.trim() === '') return '';
  
  const num = parseFloat(quantity);
  if (isNaN(num)) return quantity;
  
  if (num === Math.floor(num)) return num.toString();
  
  // Simple lookups for common cooking fractions
  if (Math.abs(num - 0.5) < 0.01) return '1/2';
  if (Math.abs(num - 1.5) < 0.01) return '1 1/2';
  if (Math.abs(num - 2.5) < 0.01) return '2 1/2';
  if (Math.abs(num - 0.25) < 0.01) return '1/4';
  if (Math.abs(num - 0.75) < 0.01) return '3/4';
  if (Math.abs(num - 1.25) < 0.01) return '1 1/4';
  if (Math.abs(num - 1.75) < 0.01) return '1 3/4';
  if (Math.abs(num - 2.25) < 0.01) return '2 1/4';
  if (Math.abs(num - 2.75) < 0.01) return '2 3/4';
  if (Math.abs(num - 0.333) < 0.01) return '1/3';
  if (Math.abs(num - 0.3333) < 0.01) return '1/3';
  if (Math.abs(num - 0.33333) < 0.01) return '1/3';
  if (Math.abs(num - 0.666) < 0.01) return '2/3';
  if (Math.abs(num - 0.6667) < 0.01) return '2/3';
  if (Math.abs(num - 0.66667) < 0.01) return '2/3';
  if (Math.abs(num - 1.333) < 0.01) return '1 1/3';
  if (Math.abs(num - 1.3333) < 0.01) return '1 1/3';
  if (Math.abs(num - 1.666) < 0.01) return '1 2/3';
  if (Math.abs(num - 1.6667) < 0.01) return '1 2/3';
  if (Math.abs(num - 2.333) < 0.01) return '2 1/3';
  if (Math.abs(num - 2.3333) < 0.01) return '2 1/3';
  if (Math.abs(num - 2.666) < 0.01) return '2 2/3';
  if (Math.abs(num - 2.6667) < 0.01) return '2 2/3';
  if (Math.abs(num - 0.125) < 0.01) return '1/8';
  if (Math.abs(num - 0.375) < 0.01) return '3/8';
  if (Math.abs(num - 0.625) < 0.01) return '5/8';
  if (Math.abs(num - 0.875) < 0.01) return '7/8';
  if (Math.abs(num - 1.125) < 0.01) return '1 1/8';
  if (Math.abs(num - 1.375) < 0.01) return '1 3/8';
  if (Math.abs(num - 1.625) < 0.01) return '1 5/8';
  if (Math.abs(num - 1.875) < 0.01) return '1 7/8';
  
  // Also handle the problematic repeating decimals
  if (Math.abs(num - 0.6666666666666666) < 0.001) return '2/3';
  
  const rounded1 = Math.round(num * 10) / 10;
  return rounded1 === Math.floor(rounded1) ? Math.floor(rounded1).toString() : rounded1.toString();
}

interface GroceryList {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface GroceryListItem {
  id: string;
  groceryListId: string;
  name: string;
  quantity?: string;
  unit?: string;
  notes?: string;
  isCompleted: boolean;
  category?: string;
  order: number;
  createdAt: Date;
  completedAt?: Date;
}

interface GroceryListRecipe {
  id: string;
  groceryListId: string;
  recipeId: string;
  variantId?: string;
  multiplier: number;
  addedAt: Date;
  recipe?: {
    title: string;
    ingredients: Array<{
      quantity?: string;
      unit?: string;
      ingredient: string;
      notes?: string;
    }>;
  };
  variant?: {
    name: string;
    ingredients?: Array<{
      quantity?: string;
      unit?: string;
      ingredient: string;
      notes?: string;
    }>;
  };
}

interface IngredientMatch {
  ingredient: {
    originalText: string;
    quantity?: number;
    unit?: string;
    ingredient: string;
    notes?: string;
  };
  existingItem?: GroceryListItem;
  confidence: number;
}

export default function GroceryListPage() {
  const params = useParams();
  const { user, loading } = useAuth();

  const [groceryList, setGroceryList] = createSignal<GroceryList | null>(null);
  const [items, setItems] = createSignal<GroceryListItem[]>([]);
  const [recipes, setRecipes] = createSignal<GroceryListRecipe[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  // Item management state
  const [newItemName, setNewItemName] = createSignal('');
  const [newItemQuantity, setNewItemQuantity] = createSignal('');
  const [newItemUnit, setNewItemUnit] = createSignal('');
  const [isAddingItem, setIsAddingItem] = createSignal(false);

  // Editing state
  const [editingItem, setEditingItem] = createSignal<string | null>(null);
  const [editingValues, setEditingValues] = createSignal<{
    name: string;
    quantity: string;
    unit: string;
    notes: string;
  }>({ name: '', quantity: '', unit: '', notes: '' });

  // Recipe selection state
  const [showRecipeModal, setShowRecipeModal] = createSignal(false);
  const [isAddingRecipe, setIsAddingRecipe] = createSignal(false);

  // Deletion state
  const [isDeleting, setIsDeleting] = createSignal(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);

  // Ingredient matching state
  const [pendingMatches, setPendingMatches] = createSignal<IngredientMatch[]>([]);
  const [pendingExactMatches, setPendingExactMatches] = createSignal<IngredientMatch[]>([]);
  const [pendingNewItems, setPendingNewItems] = createSignal<IngredientMatch[]>([]);
  const [pendingRecipeSelections, setPendingRecipeSelections] = createSignal<Array<{ recipeId: string; variantId?: string; multiplier?: number }>>([]);
  const [showMatchingModal, setShowMatchingModal] = createSignal(false);
  const [matchDecisions, setMatchDecisions] = createSignal<Map<number, 'merge' | 'separate' | 'skip'>>(new Map());

  // Redirect to login if not authenticated
  if (!loading() && !user()) {
    return <Navigate href="/login" />;
  }

  const loadGroceryList = async () => {
    try {
      const response = await fetch(`/api/grocery-lists/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setGroceryList(data.groceryList);
      } else {
        setError('Failed to load grocery list');
      }
    } catch (err) {
      console.error('Error loading grocery list:', err);
      setError('Error loading grocery list');
    }
  };

  const loadItems = async () => {
    try {
      const response = await fetch(`/api/grocery-lists/${params.id}/items`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error('Error loading items:', err);
    }
  };

  const loadRecipes = async () => {
    try {
      const response = await fetch(`/api/grocery-lists/${params.id}/recipes`);
      if (response.ok) {
        const data = await response.json();
        setRecipes(data.recipes || []);
      }
    } catch (err) {
      console.error('Error loading recipes:', err);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    await Promise.all([
      loadGroceryList(),
      loadItems(),
      loadRecipes()
    ]);
    setIsLoading(false);
  };

  createEffect(() => {
    if (!loading() && user() && params.id) {
      loadData();
    }
  });

  const handleAddItem = async (e: Event) => {
    e.preventDefault();
    if (!newItemName().trim() || isAddingItem()) return;

    setIsAddingItem(true);
    try {
      const response = await fetch(`/api/grocery-lists/${params.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItemName().trim(),
          quantity: newItemQuantity().trim() || undefined,
          unit: newItemUnit().trim() || undefined,
          isCompleted: false,
          order: items().length,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setItems(prev => [...prev, data.item]);
        setNewItemName('');
        setNewItemQuantity('');
        setNewItemUnit('');
      }
    } catch (err) {
      console.error('Error adding item:', err);
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleToggleItem = async (itemId: string, isCompleted: boolean) => {
    try {
      const response = await fetch(`/api/grocery-lists/${params.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted }),
      });

      if (response.ok) {
        const data = await response.json();
        setItems(prev => prev.map(item =>
          item.id === itemId ? data.item : item
        ));
      }
    } catch (err) {
      console.error('Error toggling item:', err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/grocery-lists/${params.id}/items/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setItems(prev => prev.filter(item => item.id !== itemId));
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const handleAddRecipe = async (recipeId: string, variantId?: string, multiplier?: number) => {
    if (isAddingRecipe()) return;

    setIsAddingRecipe(true);
    try {
      const response = await fetch(`/api/grocery-lists/${params.id}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId,
          variantId,
          multiplier: multiplier || 1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.matches && data.matches.length > 0) {
          setPendingMatches(data.matches);
          setPendingExactMatches(data.pendingExactMatches || []);
          setPendingNewItems(data.pendingNewItems || []);
          setMatchDecisions(new Map()); // Reset decisions for partial matches only
          setShowMatchingModal(true);
        }
        await loadRecipes();
        await loadItems(); // Refresh the items list to show new ingredients
        setShowRecipeModal(false);
      }
    } catch (err) {
      console.error('Error adding recipe:', err);
    } finally {
      setIsAddingRecipe(false);
    }
  };

  const handleAddMultipleRecipes = async (selections: Array<{ recipeId: string; variantId?: string; multiplier?: number }>) => {
    if (isAddingRecipe() || selections.length === 0) return;

    setIsAddingRecipe(true);
    try {
      // Step 1: Analyze ingredients without adding recipes or committing anything
      const response = await fetch(`/api/grocery-lists/${params.id}/analyze-recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipes: selections }),
      });

      if (!response.ok) {
        console.error('Failed to analyze recipes');
        return;
      }

      const analysisData = await response.json();
      
      console.log('🔍 FRONTEND RECEIVED ANALYSIS:', {
        partialMatches: analysisData.partialMatches?.length || 0,
        exactMatches: analysisData.exactMatches?.length || 0,
        newItems: analysisData.newItems?.length || 0,
        partialMatchDetails: analysisData.partialMatches?.map(m => ({
          ingredient: m.ingredient?.ingredient,
          existingItem: m.existingItem?.name || 'RECIPE-TO-RECIPE MATCH',
          confidence: Math.round(m.confidence * 100) + '%',
          matchType: m.matchType || 'existing-item',
          recipeCount: m.recipes?.length || 0,
          recipes: m.recipes?.map(r => r.title).join(', ') || ''
        }))
      });
      
      // Store the recipe selections for later commitment
      setPendingRecipeSelections(selections);
      
      // Store all the analyzed ingredient data
      setPendingMatches(analysisData.partialMatches || []);
      setPendingExactMatches(analysisData.exactMatches || []);
      setPendingNewItems(analysisData.newItems || []);

      // Step 2: If there are partial matches, show modal for user decisions
      if (analysisData.partialMatches && analysisData.partialMatches.length > 0) {
        console.log('✅ SHOWING PARTIAL MATCH MODAL with', analysisData.partialMatches.length, 'matches');
        setMatchDecisions(new Map());
        setShowMatchingModal(true);
      } else {
        console.log('❌ NO PARTIAL MATCHES - Committing directly');
        // Step 3: No partial matches - commit everything immediately
        await handleCommitRecipes();
      }

      setShowRecipeModal(false);
    } catch (err) {
      console.error('Error adding multiple recipes:', err);
    } finally {
      setIsAddingRecipe(false);
    }
  };

  const handleCommitRecipes = async () => {
    try {
      // Build decisions for partial matches based on user choices
      const partialMatchDecisions = pendingMatches().map((match, index) => {
        const decision = {
          ingredient: match.ingredient,
          action: matchDecisions().get(index) || 'skip',
          existingItem: match.existingItem,
          recipes: match.recipes, // Include all recipe ingredients for quantity aggregation
          matchType: match.matchType // Include match type for processing logic
        };
        
        console.log(`🍽️ FRONTEND DECISION ${index + 1}:`, {
          action: decision.action,
          matchType: decision.matchType,
          ingredient: decision.ingredient?.ingredient,
          recipesForAggregation: decision.recipes?.length || 0,
          recipesData: decision.recipes?.map(r => ({
            title: r.title,
            ingredient: r.ingredient,
            quantity: r.quantity,
            unit: r.unit
          }))
        });
        
        return decision;
      });

      const response = await fetch(`/api/grocery-lists/${params.id}/commit-recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipes: pendingRecipeSelections(),
          partialMatchDecisions,
          exactMatches: pendingExactMatches(),
          newItems: pendingNewItems()
        }),
      });

      if (response.ok) {
        await loadItems();
        await loadRecipes();
        setPendingMatches([]);
        setPendingExactMatches([]);
        setPendingNewItems([]);
        setPendingRecipeSelections([]);
        setMatchDecisions(new Map());
        setShowMatchingModal(false);
      }
    } catch (err) {
      console.error('Error committing recipes:', err);
    }
  };

  const handleProcessMatches = async () => {
    await handleCommitRecipes();
  };



  const setMatchDecision = (index: number, action: 'merge' | 'separate' | 'skip') => {
    setMatchDecisions(prev => new Map(prev.set(index, action)));
  };

  // Validation: Check if all partial matches have been addressed
  const allMatchesResolved = () => {
    const totalMatches = pendingMatches().length;
    const resolvedMatches = Array.from(matchDecisions().values()).filter(action => action !== undefined).length;
    return totalMatches === resolvedMatches && totalMatches > 0;
  };

  const handleEditItem = (item: GroceryListItem) => {
    setEditingItem(item.id);
    setEditingValues({
      name: item.name,
      quantity: item.quantity || '',
      unit: item.unit || '',
      notes: item.notes || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem()) return;

    try {
      const response = await fetch(`/api/grocery-lists/${params.id}/items/${editingItem()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingValues().name.trim(),
          quantity: editingValues().quantity.trim() || undefined,
          unit: editingValues().unit.trim() || undefined,
          notes: editingValues().notes.trim() || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setItems(prev => prev.map(item =>
          item.id === editingItem() ? data.item : item
        ));
        setEditingItem(null);
      }
    } catch (err) {
      console.error('Error updating item:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditingValues({ name: '', quantity: '', unit: '', notes: '' });
  };

  const handleRemoveRecipe = async (recipeId: string) => {
    try {
      const response = await fetch(`/api/grocery-lists/${params.id}/recipes/${recipeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadRecipes();
      }
    } catch (err) {
      console.error('Error removing recipe:', err);
    }
  };

  const handleDeleteList = async () => {
    if (isDeleting()) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/grocery-lists/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        window.location.href = '/grocery-lists';
      } else {
        console.error('Failed to delete grocery list');
      }
    } catch (err) {
      console.error('Error deleting grocery list:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const completedItems = createMemo(() => items().filter(item => item.isCompleted));
  const pendingItems = createMemo(() => items().filter(item => !item.isCompleted));

  const breadcrumbItems = () => [
    { label: 'Grocery Lists', href: '/grocery-lists' },
    { label: groceryList()?.name || 'Loading...', current: true },
  ];

  const headerActions = () => (
    <button
      onClick={() => setShowDeleteConfirm(true)}
      class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center gap-2"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      Delete List
    </button>
  );

  return (
    <>
      <Title>{groceryList()?.name || 'Grocery List'} - Recipe Curator</Title>
      <Show when={!loading()}>
        <PageLayout
          title={groceryList()?.name}
          subtitle={groceryList()?.description}
          headerActions={headerActions()}
          breadcrumbs={<Breadcrumbs items={breadcrumbItems()} />}
          loading={isLoading()}
          error={error()}
        >

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div class="lg:col-span-2 space-y-6">
              {/* Add Item Form */}
              <div class="bg-white dark:bg-stone-800 rounded-lg shadow-sm border border-gray-200 dark:border-stone-700 p-6">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-stone-100 mb-4">Add Item</h2>
                <form onSubmit={handleAddItem}>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="md:col-span-2">
                      <input
                        type="text"
                        placeholder="Item name"
                        value={newItemName()}
                        onInput={(e) => setNewItemName(e.target.value)}
                         class="w-full px-3 py-2 border border-gray-300 dark:border-stone-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                        required
                      />
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                       <input
                         type="text"
                         placeholder="Qty"
                         value={newItemQuantity()}
                         onInput={(e) => setNewItemQuantity(e.target.value)}
                         class="px-3 py-2 border border-gray-300 dark:border-stone-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                       />
                       <input
                         type="text"
                         placeholder="Unit"
                         value={newItemUnit()}
                         onInput={(e) => setNewItemUnit(e.target.value)}
                         class="px-3 py-2 border border-gray-300 dark:border-stone-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                       />
                    </div>
                  </div>
                  <div class="mt-4">
                    <button
                      type="submit"
                      disabled={isAddingItem() || !newItemName().trim()}
                       class="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isAddingItem() ? 'Adding...' : 'Add Item'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Shopping List */}
              <div class="bg-white dark:bg-stone-800 rounded-lg shadow-sm border border-gray-200 dark:border-stone-700">
                <div class="p-6 border-b border-gray-200 dark:border-stone-700">
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-stone-100">Shopping List</h2>
                  <p class="text-sm text-gray-500 dark:text-stone-400 mt-1">
                    {pendingItems().length} items to buy, {completedItems().length} completed
                  </p>
                </div>

                 <div class="divide-y divide-gray-200 dark:divide-stone-700">
                  {/* Pending Items */}
                  <For each={pendingItems()}>
                    {(item) => (
                      <div class="p-4 group">
                        <Show
                          when={editingItem() === item.id}
                          fallback={
                            <div class="flex items-center justify-between">
                              <div class="flex items-center space-x-3">
                               <input
                                 type="checkbox"
                                 checked={item.isCompleted}
                                 onChange={(e) => handleToggleItem(item.id, e.target.checked)}
                                 class="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                               />
                                <div class="cursor-pointer" onClick={() => handleEditItem(item)}>
                                   <span class="font-medium text-gray-900 dark:text-stone-100 hover:text-emerald-600 dark:hover:text-emerald-400">{item.name}</span>
                                  <Show when={item.quantity || item.unit}>
                                     <span class="text-gray-500 dark:text-stone-400 ml-2">
                                      {formatQuantity(item.quantity)} {item.unit || ''}
                                    </span>
                                  </Show>
                                  <Show when={item.notes}>
                                     <div class="text-sm text-gray-500 dark:text-stone-400">{item.notes}</div>
                                  </Show>
                                </div>
                              </div>
                              <div class="flex items-center space-x-2">
                                <button
                                  onClick={() => handleEditItem(item)}
                                   class="opacity-0 group-hover:opacity-100 text-emerald-500 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-opacity"
                                  title="Edit item"
                                >
                                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                   class="opacity-0 group-hover:opacity-100 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-opacity"
                                  title="Delete item"
                                >
                                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          }
                        >
                          {/* Edit Mode */}
                          <div class="space-y-3">
                            <div class="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={item.isCompleted}
                                onChange={(e) => handleToggleItem(item.id, e.target.checked)}
                                class="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <div class="flex-1">
                                <input
                                  type="text"
                                  value={editingValues().name}
                                  onInput={(e) => setEditingValues(prev => ({ ...prev, name: e.target.value }))}
                                   class="w-full px-2 py-1 border border-gray-300 dark:border-stone-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                                  placeholder="Item name"
                                />
                              </div>
                            </div>
                            <div class="ml-7 grid grid-cols-2 gap-2">
                               <input
                                 type="text"
                                 value={editingValues().quantity}
                                 onInput={(e) => setEditingValues(prev => ({ ...prev, quantity: e.target.value }))}
                                 class="px-2 py-1 border border-gray-300 dark:border-stone-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                                 placeholder="Quantity"
                               />
                               <input
                                 type="text"
                                 value={editingValues().unit}
                                 onInput={(e) => setEditingValues(prev => ({ ...prev, unit: e.target.value }))}
                                 class="px-2 py-1 border border-gray-300 dark:border-stone-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                                 placeholder="Unit"
                               />
                            </div>
                            <div class="ml-7">
                              <input
                                type="text"
                                value={editingValues().notes}
                                onInput={(e) => setEditingValues(prev => ({ ...prev, notes: e.target.value }))}
                                 class="w-full px-2 py-1 border border-gray-300 dark:border-stone-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                                placeholder="Notes (optional)"
                              />
                            </div>
                            <div class="ml-7 flex space-x-2">
                              <button
                                onClick={handleSaveEdit}
                                class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                 class="px-3 py-1 bg-gray-300 dark:bg-stone-600 text-gray-700 dark:text-stone-300 rounded text-sm hover:bg-gray-400 dark:hover:bg-stone-500"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </Show>
                      </div>
                    )}
                  </For>

                  {/* Completed Items */}
                  <Show when={completedItems().length > 0}>
                     <div class="bg-gray-50 dark:bg-stone-800">
                       <div class="p-4 border-b border-gray-200 dark:border-stone-700">
                         <h3 class="text-sm font-medium text-gray-700 dark:text-stone-300">Completed ({completedItems().length})</h3>
                       </div>
                      <For each={completedItems()}>
                        {(item) => (
                          <div class="p-4 flex items-center justify-between group opacity-60">
                            <div class="flex items-center space-x-3">
                               <input
                                 type="checkbox"
                                 checked={item.isCompleted}
                                 onChange={(e) => handleToggleItem(item.id, e.target.checked)}
                                 class="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                               />
                               <div>
                                 <span class="font-medium text-gray-900 dark:text-stone-100 line-through">{item.name}</span>
                                <Show when={item.quantity || item.unit}>
                                   <span class="text-gray-500 dark:text-stone-400 ml-2">
                                    {formatQuantity(item.quantity)} {item.unit || ''}
                                  </span>
                                </Show>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                               class="opacity-0 group-hover:opacity-100 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-opacity"
                            >
                              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>

                  <Show when={items().length === 0}>
                    <div class="p-8 text-center">
                       <p class="text-gray-500 dark:text-stone-400">No items yet. Add some items or recipes to get started!</p>
                    </div>
                  </Show>
                </div>
              </div>
            </div>
            {/* Sidebar */}
            <div class="lg:col-span-1 space-y-6">
              {/* Add Recipe */}
               <div class="bg-white dark:bg-stone-800 rounded-lg shadow-sm border border-gray-200 dark:border-stone-700 p-6">
                 <h3 class="text-lg font-semibold text-gray-900 dark:text-stone-100 mb-4">Add Recipe</h3>
                <button
                  onClick={() => setShowRecipeModal(true)}
                   class="w-full px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                >
                  Add Recipe Ingredients
                </button>
              </div>

              {/* Added Recipes */}
              <Show when={recipes().length > 0}>
                 <div class="bg-white dark:bg-stone-800 rounded-lg shadow-sm border border-gray-200 dark:border-stone-700 p-6">
                   <h3 class="text-lg font-semibold text-gray-900 dark:text-stone-100 mb-4">Added Recipes</h3>
                  <div class="space-y-3">
                    <For each={recipes()}>
                      {(recipe) => (
                         <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-stone-700 rounded-md">
                           <div>
                             <div class="font-medium text-gray-900 dark:text-stone-100">{recipe.recipe?.title}</div>
                             <div class="text-sm text-gray-500 dark:text-stone-400">×{recipe.multiplier}</div>
                           </div>
                          <button
                            onClick={() => handleRemoveRecipe(recipe.id)}
                             class="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </div>
          </div>


          {/* Enhanced Recipe Selection Modal */}
          <RecipeSelectorModal
            isOpen={showRecipeModal()}
            onClose={() => setShowRecipeModal(false)}
            onSelectMultiple={handleAddMultipleRecipes}
            isLoading={isAddingRecipe()}
            existingRecipeIds={new Set(recipes().map(r => r.recipeId))}
            enableMultiSelect={true}
          />

          {/* Ingredient Matching Modal */}
          <Show when={showMatchingModal()}>
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
               <div class="bg-white dark:bg-stone-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-96 overflow-y-auto">
                 <h3 class="text-lg font-semibold text-gray-900 dark:text-stone-100 mb-4">Smart Ingredient Matching</h3>
                 <p class="text-sm text-gray-600 dark:text-stone-400 mb-4">
                  We found some ingredients that might match existing items. Choose how to handle each:
                  <Show when={pendingExactMatches().length > 0 || pendingNewItems().length > 0}>
                     <span class="block mt-1 text-emerald-600 dark:text-emerald-400 text-xs">
                      Note: {pendingExactMatches().length} exact matches and {pendingNewItems().length} new ingredients will be processed automatically after this review.
                    </span>
                  </Show>
                </p>
                <div class="space-y-3">
                  {/* Show only partial matches that need user confirmation */}
                  <For each={pendingMatches()}>
                    {(match, index) => (
                        <div class="border border-gray-200 dark:border-stone-700 rounded-md p-4">
                           <div class="font-medium text-gray-900 dark:text-stone-100 mb-2">
                            New: {match.ingredient.ingredient}
                          </div>
                          
                          {/* Show matching ingredients from different recipes */}
                          <Show when={match.recipes && match.recipes.length > 0}>
                            <div class="mb-3">
                               <div class="text-xs text-gray-500 dark:text-stone-400 mb-1">Ingredients to combine:</div>
                               <div class="text-sm text-gray-700 dark:text-stone-300 space-y-1">
                                <For each={match.recipes}>
                                  {(recipe) => (
                                    <div class="flex justify-between">
                                      <span>• {recipe.ingredient}</span>
                                       <span class="text-gray-500 dark:text-stone-400 text-xs">from {recipe.title}</span>
                                    </div>
                                  )}
                                </For>
                              </div>
                            </div>
                          </Show>
                          
                          {/* Show existing item info only if this is a match with existing grocery list item */}
                          <Show when={match.existingItem}>
                             <div class="text-sm text-gray-600 dark:text-stone-400 mb-3">
                              Existing: {match.existingItem?.name}
                              ({formatQuantity(match.existingItem?.quantity)} {match.existingItem?.unit || ''})
                               <span class="ml-2 text-yellow-600 dark:text-yellow-400">
                                {Math.round(match.confidence * 100)}% match
                              </span>
                            </div>
                          </Show>
                          
                          {/* Show recipe-to-recipe match indicator */}
                          <Show when={!match.existingItem && match.recipes && match.recipes.length > 1}>
                             <div class="text-sm text-orange-600 dark:text-orange-400 mb-3">
                              ⚠️ Multiple recipes contain similar ingredients
                            </div>
                          </Show>
                         <div class="flex space-x-2">
                           <button
                             onClick={() => setMatchDecision(index(), 'merge')}
                             class={`px-3 py-1 text-sm rounded ${matchDecisions().get(index()) === 'merge'
                               ? 'bg-green-600 text-white'
                                 : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                               }`}
                           >
                             {match.existingItem ? 'Merge Quantities' : 'Combine Into One'}
                           </button>
                           <button
                             onClick={() => setMatchDecision(index(), 'separate')}
                             class={`px-3 py-1 text-sm rounded ${matchDecisions().get(index()) === 'separate'
                               ? 'bg-blue-600 text-white'
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                               }`}
                           >
                             {match.existingItem ? 'Keep Separate' : 'Add Separately'}
                           </button>
                          <button
                            onClick={() => setMatchDecision(index(), 'skip')}
                            class={`px-3 py-1 text-sm rounded ${matchDecisions().get(index()) === 'skip'
                              ? 'bg-gray-600 text-white'
                               : 'bg-gray-100 dark:bg-stone-700 text-gray-800 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-600'
                              }`}
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
                <div class="flex justify-between items-center mt-6">
                   <div class="text-sm text-gray-600 dark:text-stone-400">
                    {allMatchesResolved() 
                      ? "✓ All partial matches addressed" 
                      : `${Array.from(matchDecisions().values()).filter(action => action !== undefined).length} of ${pendingMatches().length} partial matches addressed`
                    }
                  </div>
                  <div class="flex space-x-3">
                    <button
                      onClick={() => {
                        setShowMatchingModal(false);
                        setPendingMatches([]);
                        setPendingExactMatches([]);
                        setPendingNewItems([]);
                        setPendingRecipeSelections([]);
                        setMatchDecisions(new Map());
                      }}
                       class="px-4 py-2 text-gray-700 dark:text-stone-300 border border-gray-300 dark:border-stone-600 rounded-md hover:bg-gray-50 dark:hover:bg-stone-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleProcessMatches}
                      disabled={!allMatchesResolved()}
                      class={`px-4 py-2 rounded-md transition-colors ${
                         allMatchesResolved()
                           ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                           : 'bg-gray-300 dark:bg-stone-600 text-gray-500 dark:text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      Apply Choices
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Show>

          {/* Delete Confirmation Modal */}
          <Show when={showDeleteConfirm()}>
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
               <div class="bg-white dark:bg-stone-800 rounded-lg p-6 w-full max-w-md mx-4">
                 <h3 class="text-lg font-semibold text-gray-900 dark:text-stone-100 mb-4">Delete Grocery List</h3>
                 <p class="text-gray-600 dark:text-stone-400 mb-6">
                  Are you sure you want to delete "{groceryList()?.name}"? This action cannot be undone and will remove all items and recipes from this list.
                </p>
                <div class="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting()}
                     class="px-4 py-2 text-gray-700 dark:text-stone-300 border border-gray-300 dark:border-stone-600 rounded-md hover:bg-gray-50 dark:hover:bg-stone-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteList}
                    disabled={isDeleting()}
                    class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeleting() ? 'Deleting...' : 'Delete List'}
                  </button>
                </div>
              </div>
            </div>
          </Show>

        </PageLayout >
      </Show >
    </>
  );
}
