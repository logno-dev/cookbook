import { Title } from "@solidjs/meta";
import { Show, createSignal, createResource, For, createEffect } from "solid-js";
import { createStore } from "solid-js/store";
import { useAuth } from "~/lib/auth-context";
import { useNavigate, useParams, useSearchParams } from "@solidjs/router";
import { multiplyQuantity, formatFractionWithUnicode } from "~/lib/fraction-utils";
import { useConfirm, useToast } from "~/lib/notifications";
import PageLayout from "~/components/PageLayout";
import Breadcrumbs from "~/components/Breadcrumbs";
import { SkeletonRecipeDetail } from "~/components/Skeletons";

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
  userId: string;
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

interface RecipeVariant {
  id: string;
  recipeId: string;
  name: string;
  description?: string;
  ingredients?: RecipeIngredient[];
  instructions?: RecipeInstruction[];
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
}

export default function RecipeDetail() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const confirm = useConfirm();
  const toast = useToast();
  
  const [isEditing, setIsEditing] = createSignal(false);
  const [formData, setFormData] = createStore<Partial<Recipe>>({});

  // Helper functions to update nested arrays in the store
  const updateFormField = (field: keyof Recipe, value: any) => {
    setFormData(field, value);
  };

  const updateIngredientField = (index: number, field: keyof RecipeIngredient, value: any) => {
    setFormData("ingredients", index, field, value);
  };

  const updateInstructionField = (index: number, field: keyof RecipeInstruction, value: any) => {
    setFormData("instructions", index, field, value);
  };

  // Helper functions for variant updates
  const updateVariantFormField = (field: keyof RecipeVariant, value: any) => {
    setVariantChanges(field, value);
  };

  const updateVariantIngredientField = (index: number, field: keyof RecipeIngredient, value: any) => {
    setVariantChanges("ingredients", index, field, value);
  };

  const updateVariantInstructionField = (index: number, field: keyof RecipeInstruction, value: any) => {
    setVariantChanges("instructions", index, field, value);
  };
  const [error, setError] = createSignal("");
  const [saving, setSaving] = createSignal(false);
  
  // Variant state
  const [selectedVariantId, setSelectedVariantId] = createSignal<string | null>(null);
  const [editingVariantId, setEditingVariantId] = createSignal<string | null>(null);
  const [variantChanges, setVariantChanges] = createStore<Partial<RecipeVariant>>({});
  const [showCreateVariantDialog, setShowCreateVariantDialog] = createSignal(false);
  const [newVariantName, setNewVariantName] = createSignal("");

  // Recipe multiplier state
  const [recipeMultiplier, setRecipeMultiplier] = createSignal(1);

  // Fork state
  const [isForking, setIsForking] = createSignal(false);
  const [showForkDialog, setShowForkDialog] = createSignal(false);
  const [forkTitle, setForkTitle] = createSignal("");

  // Auth redirect effect - only redirect after loading completes
  createEffect(() => {
    if (!authLoading() && !user()) {
      navigate("/login", { replace: true });
    }
  });

  const [recipe, { refetch }] = createResource(() => {
    // Only fetch on client side after auth is loaded, or if it's a new recipe
    if (params.id === "new") return "new";
    if (typeof window === 'undefined') return null; // Skip SSR fetch
    if (authLoading()) return null; // Wait for auth to load
    if (!user()) return null; // Don't fetch if not authenticated
    return params.id;
  }, async (id) => {
    if (id === "new") return null;
    if (!id) return null;
    
    try {
      // Validate and encode the ID to ensure it's a valid URL component
      const encodedId = encodeURIComponent(id);
      const url = `/api/recipes/${encodedId}`;
      
      console.log('Fetching recipe with URL:', url, 'for ID:', id);
      
      const response = await fetch(url, {
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Recipe fetch response:', {
        status: response.status,
        statusText: response.statusText,
      });
      
      if (!response.ok) {
        let errorText = '';
        try {
          const errorData = await response.clone().json();
          errorText = errorData.error || errorData.message || response.statusText;
          console.error('Recipe fetch error details:', errorData);
        } catch {
          errorText = await response.text();
          console.error('Recipe fetch error text:', errorText);
        }
        
        throw new Error(`Recipe fetch failed: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Recipe fetch successful:', { recipeId: data.recipe?.id, title: data.recipe?.title });
      return data.recipe as Recipe;
    } catch (error) {
      console.error('Recipe fetch error:', error, 'for ID:', id);
      throw error;
    }
  });

  const [tags, { refetch: refetchTags }] = createResource(() => {
    // Only fetch on client side after auth is loaded
    if (typeof window === 'undefined') return null; // Skip SSR fetch
    if (authLoading()) return null; // Wait for auth to load
    if (!user()) return null; // Don't fetch if not authenticated
    return 'fetch-tags';
  }, async () => {
    try {
      console.log('Fetching tags');
      
      const response = await fetch("/api/tags", {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        console.error('Tags fetch failed:', response.status, response.statusText);
        throw new Error("Failed to fetch tags");
      }
      
      const data = await response.json();
      console.log('Tags fetch successful:', data.tags?.length || 0, 'tags');
      return data.tags as Tag[];
    } catch (error) {
      console.error('Tags fetch error:', error);
      throw error;
    }
  });

  const [variants, { refetch: refetchVariants }] = createResource(() => {
    // Only fetch on client side after auth is loaded
    if (params.id === "new") return "new";
    if (typeof window === 'undefined') return null; // Skip SSR fetch
    if (authLoading()) return null; // Wait for auth to load
    if (!user()) return null; // Don't fetch if not authenticated
    return params.id;
  }, async (id) => {
    if (id === "new") return [];
    if (!id) return [];
    
    try {
      const encodedId = encodeURIComponent(id);
      const url = `/api/recipes/${encodedId}/variants`;
      
      console.log('Fetching variants with URL:', url, 'for ID:', id);
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        console.log('Variants fetch failed:', response.status, 'returning empty array');
        return [];
      }
      
      const data = await response.json();
      console.log('Variants fetch successful:', data.variants?.length || 0, 'variants');
      return data.variants as RecipeVariant[];
    } catch (error) {
      console.error('Variants fetch error:', error, 'returning empty array');
      return [];
    }
  });

  // Fetch cookbook data if coming from a cookbook
  const [sourceCookbook, { refetch: refetchCookbook }] = createResource(() => {
    const cookbookId = searchParams.cookbookId;
    // Only fetch on client side after auth is loaded
    if (!cookbookId) return null;
    if (typeof window === 'undefined') return null; // Skip SSR fetch
    if (authLoading()) return null; // Wait for auth to load
    if (!user()) return null; // Don't fetch if not authenticated
    return cookbookId;
  }, async (cookbookId) => {
    if (!cookbookId) return null;
    
    try {
      const encodedId = encodeURIComponent(cookbookId);
      const url = `/api/cookbooks/${encodedId}`;
      
      console.log('Fetching cookbook with URL:', url, 'for ID:', cookbookId);
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        console.log('Cookbook fetch failed:', response.status, 'returning null');
        return null;
      }
      
      const data = await response.json();
      console.log('Cookbook fetch successful:', data.cookbook?.title);
      return data.cookbook;
    } catch (error) {
      console.error('Cookbook fetch error:', error, 'returning null');
      return null;
    }
  });

  // Computed signal for the current recipe data (base or variant)
  const currentRecipeData = () => {
    const base = recipe();
    if (!base) return formData;
    
    if (selectedVariantId() && variants()) {
      const variant = variants()!.find(v => v.id === selectedVariantId());
      if (variant) {
        // Properly merge variant with base recipe
        const mergedIngredients = base.ingredients.map((baseIngredient, index) => {
          const variantIngredient = variant.ingredients?.[index];
          // If variant has a non-empty ingredient at this index, use it; otherwise use base
          if (variantIngredient && variantIngredient.ingredient && variantIngredient.ingredient.trim()) {
            return variantIngredient;
          }
          return baseIngredient;
        });

        const mergedInstructions = base.instructions.map((baseInstruction, index) => {
          const variantInstruction = variant.instructions?.[index];
          // If variant has a non-empty instruction at this index, use it; otherwise use base
          if (variantInstruction && variantInstruction.instruction && variantInstruction.instruction.trim()) {
            return variantInstruction;
          }
          return baseInstruction;
        });

        return {
          ...base,
          ingredients: mergedIngredients,
          instructions: mergedInstructions,
          ...(variant.servings !== undefined && { servings: variant.servings }),
          ...(variant.yield !== undefined && { yield: variant.yield }),
          ...(variant.cookTime !== undefined && { cookTime: variant.cookTime }),
          ...(variant.prepTime !== undefined && { prepTime: variant.prepTime }),
          ...(variant.totalTime !== undefined && { totalTime: variant.totalTime }),
          ...(variant.restTime !== undefined && { restTime: variant.restTime }),
          ...(variant.difficulty !== undefined && { difficulty: variant.difficulty }),
          ...(variant.cuisine !== undefined && { cuisine: variant.cuisine }),
          ...(variant.category !== undefined && { category: variant.category }),
          ...(variant.diet !== undefined && { diet: variant.diet }),
          ...(variant.imageUrl !== undefined && { imageUrl: variant.imageUrl }),
          ...(variant.sourceUrl !== undefined && { sourceUrl: variant.sourceUrl }),
          ...(variant.sourceAuthor !== undefined && { sourceAuthor: variant.sourceAuthor }),
          ...(variant.equipment !== undefined && { equipment: variant.equipment }),
          ...(variant.notes !== undefined && { notes: variant.notes }),
          ...(variant.nutrition !== undefined && { nutrition: variant.nutrition }),
        };
      }
    }
    
    return base;
  };

  createEffect(() => {
    if (recipe()) {
      console.log("Recipe loaded with tags:", recipe()!.tags);
      setFormData(recipe()!);
    } else if (params.id === "new") {
      setFormData({
        title: "",
        description: "",
        ingredients: [{ ingredient: "" }],
        instructions: [{ step: 1, instruction: "" }],
        servings: undefined,
        cookTime: undefined,
        prepTime: undefined,
        difficulty: "",
        cuisine: "",
        category: "",
        diet: "",
        imageUrl: "",
        sourceUrl: "",
        sourceAuthor: "",
        equipment: [],
        notes: "",
        tags: [],
      });
      setIsEditing(true);
    }
  });

  // Update form data when variant selection changes
  createEffect(() => {
    if (!isEditing()) {
      const current = currentRecipeData();
      if (current) {
        setFormData(current);
      }
    }
  });

  const collectFormData = () => {
    // Filter out empty ingredients and instructions
    const ingredients = (formData.ingredients || []).filter(ingredient => 
      ingredient.ingredient && ingredient.ingredient.trim() !== ""
    );
    
    const instructions = (formData.instructions || []).filter(instruction => 
      instruction.instruction && instruction.instruction.trim() !== ""
    );

    return {
      ...formData,
      ingredients,
      instructions,
      tagIds: formData.tags?.map(t => t.id) || [],
    };
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const data = collectFormData();
      console.log("Saving recipe:", data.title);
      delete data.tags;
      delete data.id;
      delete data.createdAt;
      delete data.updatedAt;

      const url = params.id === "new" ? "/api/recipes" : `/api/recipes/${params.id}`;
      const method = params.id === "new" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save recipe");
      }

      if (params.id === "new") {
        const result = await response.json();
        navigate(`/recipe/${result.recipeId}`);
      } else {
        await refetch();
        setIsEditing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVariant = async () => {
    setSaving(true);
    setError("");

    try {
      const variantId = editingVariantId();
      if (!variantId) throw new Error("No variant selected");

      const url = `/api/recipes/${params.id}/variants/${variantId}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(variantChanges()),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save variant");
      }

      setIsEditing(false);
      setEditingVariantId(null);
      setVariantChanges({});
      await refetchVariants();
      
      // Refresh the current display
      const current = currentRecipeData();
      if (current) {
        setFormData(current);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateVariant = async () => {
    const name = newVariantName().trim();
    if (!name) return;

    try {
      const response = await fetch(`/api/recipes/${params.id}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error("Failed to create variant");
      }

      const data = await response.json();
      setShowCreateVariantDialog(false);
      setNewVariantName("");
      await refetchVariants();
      
      // Switch to editing the new variant
      setEditingVariantId(data.variantId);
      setVariantChanges({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create variant");
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm.confirm({
      title: "Delete Recipe",
      message: "Are you sure you want to delete this recipe? This action cannot be undone.",
      confirmText: "Delete Recipe",
      variant: "danger"
    });
    
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/recipes/${params.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete recipe");
      }

      toast.success("Recipe deleted successfully");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete recipe");
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleFork = async () => {
    setIsForking(true);
    try {
      const response = await fetch(`/api/recipes/${params.id}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          newTitle: forkTitle() || undefined 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fork recipe");
      }

      const result = await response.json();
      setShowForkDialog(false);
      setForkTitle("");
      navigate(`/recipe/${result.recipeId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fork recipe");
    } finally {
      setIsForking(false);
    }
  };

  const openForkDialog = () => {
     const currentTitle = formData.title || "Untitled Recipe";
    setForkTitle(`${currentTitle} (Copy)`);
    setShowForkDialog(true);
  };

  const isOwnRecipe = () => {
    const currentRecipe = recipe();
    return currentRecipe && currentRecipe.userId === user()?.id;
  };

  const addIngredient = () => {
    const currentIngredients = formData.ingredients || [];
    setFormData("ingredients", [...currentIngredients, { ingredient: "" }]);
  };

  const removeIngredient = (index: number) => {
    const currentIngredients = formData.ingredients || [];
    setFormData("ingredients", currentIngredients.filter((_, i) => i !== index));
  };

  const addInstruction = () => {
    const currentInstructions = formData.instructions || [];
    const nextStep = currentInstructions.length + 1;
    setFormData("instructions", [...currentInstructions, { step: nextStep, instruction: "" }]);
  };

  const removeInstruction = (index: number) => {
    const currentInstructions = formData.instructions || [];
    const filteredInstructions = currentInstructions.filter((_, i) => i !== index);
    // Renumber the steps
    const renumberedInstructions = filteredInstructions.map((instruction, i) => ({
      ...instruction,
      step: i + 1
    }));
    setFormData("instructions", renumberedInstructions);
  };



  // Variant ingredient helpers
  const updateVariantIngredient = (index: number, field: keyof RecipeIngredient, value: string) => {
    const currentIngredients = variantChanges.ingredients || [];
    const variantIngredients = [...currentIngredients];
    
    // Ensure we have an array that's at least as long as the original
    const originalLength = recipe()?.ingredients?.length || 0;
    while (variantIngredients.length <= index) {
      variantIngredients.push({ ingredient: "" });
    }
    
    // Update specific field
    variantIngredients[index] = { ...variantIngredients[index], [field]: value };
    
    setVariantChanges("ingredients", variantIngredients);
  };

  const clearVariantIngredient = (index: number) => {
    const currentIngredients = variantChanges.ingredients || [];
    const variantIngredients = [...currentIngredients];
    
    if (index < variantIngredients.length) {
      variantIngredients[index] = { ingredient: "" };
      setVariantChanges("ingredients", variantIngredients);
    }
  };

  // Variant instruction helpers
  const updateVariantInstruction = (index: number, field: keyof RecipeInstruction, value: string | number) => {
    const currentInstructions = variantChanges.instructions || [];
    const variantInstructions = [...currentInstructions];
    
    // Ensure we have an array that's at least as long as the original
    const originalLength = recipe()?.instructions?.length || 0;
    while (variantInstructions.length <= index) {
      variantInstructions.push({ step: variantInstructions.length + 1, instruction: "" });
    }
    
    // Update specific field
    variantInstructions[index] = { ...variantInstructions[index], [field]: value };
    
    setVariantChanges("instructions", variantInstructions);
  };



  const toggleTag = (tag: Tag) => {
    if (!tag || !tag.id) return;
    
    const currentTags = (formData.tags || []).filter(t => t && t.id); // Filter out invalid tags
    const isSelected = currentTags.some(t => t.id === tag.id);
    
    if (isSelected) {
      setFormData("tags", currentTags.filter(t => t.id !== tag.id));
    } else {
      setFormData("tags", [...currentTags, tag]);
    }
  };

  const [newTagName, setNewTagName] = createSignal("");
  const [creatingTag, setCreatingTag] = createSignal(false);

  const createTag = async () => {
    const tagName = newTagName().trim();
    if (!tagName) return;

    setCreatingTag(true);
    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tagName }),
      });

      if (!response.ok) {
        throw new Error("Failed to create tag");
      }

      const data = await response.json();
      const newTag = data.tag;
      
      // Add the new tag to the recipe
      const current = formData;
      setFormData({
        ...current,
        tags: [...(current.tags || []), newTag],
      });
      
      setNewTagName("");
      // Refresh tags list without reloading the page
      await refetchTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tag");
    } finally {
      setCreatingTag(false);
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

  const isNewRecipe = () => params.id === "new";

  // Create breadcrumbs based on navigation context
  const breadcrumbItems = () => {
    const fromParam = searchParams.from;
    const cookbookId = searchParams.cookbookId;
     const recipeTitle = formData.title || "Recipe";

    if (fromParam === "cookbook" && cookbookId && sourceCookbook()) {
      return [
        { label: 'Cookbooks', href: '/cookbooks' },
        { label: sourceCookbook()!.title, href: `/cookbooks/${cookbookId}` },
        { label: isNewRecipe() ? "New Recipe" : recipeTitle, current: true },
      ];
    } else if (fromParam === "dashboard") {
      return [
        { label: 'Dashboard', href: '/dashboard' },
        { label: isNewRecipe() ? "New Recipe" : recipeTitle, current: true },
      ];
    } else {
      // Default breadcrumbs when context is unknown (direct links)
      return [
        { label: 'Dashboard', href: '/dashboard' },
        { label: isNewRecipe() ? "New Recipe" : recipeTitle, current: true },
      ];
    }
  };

  // Helper to check if a field is different in the selected variant
  const isFieldModifiedInVariant = (fieldName: string) => {
    if (!selectedVariantId() || !variants()) return false;
    const variant = variants()!.find(v => v.id === selectedVariantId());
    return variant && variant[fieldName as keyof RecipeVariant] !== undefined;
  };

  // Helper to get the original value for a field
  const getOriginalValue = (fieldName: string) => {
    return recipe()?.[fieldName as keyof Recipe];
  };

  // Helper to get current variant data
  const getCurrentVariant = () => {
    if (!selectedVariantId() || !variants()) return null;
    return variants()!.find(v => v.id === selectedVariantId()) || null;
  };

  // Helper to get editing variant data
  const getEditingVariant = () => {
    if (!editingVariantId() || !variants()) return null;
    return variants()!.find(v => v.id === editingVariantId()) || null;
  };

  // Helper to check if individual ingredient is modified in variant
  const isIngredientModified = (index: number) => {
    const variant = getCurrentVariant();
    if (!variant || !variant.ingredients) return false;
    
    const originalIngredients = recipe()?.ingredients || [];
    const variantIngredients = variant.ingredients;
    
    // If this index doesn't exist in the variant, it's not modified
    if (index >= variantIngredients.length) return false;
    
    // If this index doesn't exist in original, can't compare
    if (index >= originalIngredients.length) return false;
    
    const original = originalIngredients[index];
    const variantItem = variantIngredients[index];
    
    // Check if the variant item is actually different from original
    // A variant item with empty ingredient field means "use original"
    if (!variantItem.ingredient) return false;
    
    return JSON.stringify(original) !== JSON.stringify(variantItem);
  };

  // Helper to check if individual instruction is modified in variant
  const isInstructionModified = (index: number) => {
    const variant = getCurrentVariant();
    if (!variant || !variant.instructions) return false;
    
    const originalInstructions = recipe()?.instructions || [];
    const variantInstructions = variant.instructions;
    
    // If this index doesn't exist in the variant, it's not modified
    if (index >= variantInstructions.length) return false;
    
    // If this index doesn't exist in original, can't compare
    if (index >= originalInstructions.length) return false;
    
    const original = originalInstructions[index];
    const variantItem = variantInstructions[index];
    
    // Check if the variant item is actually different from original
    // A variant item with empty instruction field means "use original"
    if (!variantItem.instruction) return false;
    
    return JSON.stringify(original) !== JSON.stringify(variantItem);
  };



  return (
    <>
      <Title>{isNewRecipe() ? "New Recipe" : formData.title || "Recipe"} - Recipe Curator</Title>
      {authLoading() || !user() || (recipe.loading && !isNewRecipe()) ? (
        <main class="min-h-screen bg-gray-50 dark:bg-stone-900 pt-16">
          <div class="max-w-6xl mx-auto px-4 py-8">
            <SkeletonRecipeDetail />
          </div>
        </main>
      ) : recipe.error ? (
        <main class="min-h-screen bg-gray-50 dark:bg-stone-900 pt-16">
          <div class="max-w-6xl mx-auto px-4 py-8">
            <div class="text-center py-8">
              <p class="text-red-600">Error loading recipe: {recipe.error.message}</p>
            </div>
          </div>
        </main>
       ) : (formData.title !== undefined || isNewRecipe()) ? (
        <PageLayout
           title={isNewRecipe() ? "New Recipe" : formData.title || "Recipe"}
          breadcrumbs={<Breadcrumbs items={breadcrumbItems()} />}
        >
         <Show when={formData.title !== undefined || isNewRecipe()}>
          <div class="bg-white dark:bg-stone-800 rounded-lg shadow-lg overflow-hidden">
            <div class="p-6 border-b border-gray-200 dark:border-stone-700">
              <div class="space-y-4">
                {/* Title and Variant Selector */}
                <Show
                  when={isEditing()}
                  fallback={
                    <div>
                       <div class="flex items-center gap-4 mb-2">
                           <h1 class="text-3xl font-bold text-gray-900 dark:text-stone-100">{formData.title}</h1>
                         <Show when={!isNewRecipe() && variants() && variants()!.length > 0}>
                           <select
                             value={selectedVariantId() || ""}
                             onChange={(e) => setSelectedVariantId(e.currentTarget.value || null)}
                              class="px-3 py-1 text-sm border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100"
                           >
                             <option value="">Original Recipe</option>
                             <For each={variants()}>
                               {(variant) => (
                                 <option value={variant.id}>{variant.name}</option>
                               )}
                             </For>
                           </select>
                         </Show>
                       </div>
                      <Show when={formData.description}>
                          <p class="text-gray-600 dark:text-stone-400 text-lg">{formData.description}</p>
                      </Show>
                    </div>
                  }
                >
                  <div class="space-y-4">
                    <input
                      type="text"
                      name="title"
                      placeholder="Recipe title"
                       value={formData.title || ""}
                      onInput={(e) => updateFormField("title", e.currentTarget.value)}
                       class="text-3xl font-bold text-gray-900 dark:text-stone-100 w-full border-none outline-none bg-transparent placeholder-gray-400 dark:placeholder-stone-500"
                      disabled={editingVariantId() !== null} // Can't edit title in variant mode
                    />
                    <textarea
                      name="description"
                      placeholder="Recipe description (optional)"
                       value={formData.description || ""}
                      onInput={(e) => updateFormField("description", e.currentTarget.value)}
                       class="text-gray-600 dark:text-stone-400 text-lg w-full border-none outline-none bg-transparent placeholder-gray-400 dark:placeholder-stone-500 resize-none"
                      rows="2"
                      disabled={editingVariantId() !== null} // Can't edit description in variant mode for now
                    />
                  </div>
                </Show>

                {/* Action Bar - Separate row for controls */}
                 <div class="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-stone-700">
                  <Show when={isEditing() && !isNewRecipe()}>
                    <div class="flex items-center gap-2">
                       <label class="text-sm font-medium text-gray-700 dark:text-stone-300">Editing:</label>
                      <select
                        value={editingVariantId() || ""}
                        onChange={(e) => {
                          const value = e.currentTarget.value;
                          if (value === "NEW_VARIANT") {
                            setShowCreateVariantDialog(true);
                            // Reset the dropdown
                            e.currentTarget.value = editingVariantId() || "";
                          } else {
                            const newVariantId = value || null;
                            setEditingVariantId(newVariantId);
                            if (newVariantId) {
                              // Load existing variant data
                              const variant = variants()?.find(v => v.id === newVariantId);
                              if (variant) {
                                const { id, recipeId, name, description, createdAt, updatedAt, ...changes } = variant;
                                setVariantChanges(changes);
                              }
                            } else {
                              // Editing original recipe
                              setVariantChanges({});
                            }
                          }
                        }}
                         class="px-3 py-2 text-sm border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100"
                      >
                        <option value="">Original Recipe</option>
                        <For each={variants()}>
                          {(variant) => (
                            <option value={variant.id}>{variant.name}</option>
                          )}
                        </For>
                        <option value="NEW_VARIANT">+ Create New Variant</option>
                      </select>
                    </div>
                  </Show>

                   <div class="flex gap-2 flex-wrap">
                      <Show when={!isNewRecipe()}>
                        <Show
                          when={isEditing()}
                          fallback={
                            <button
                              onClick={() => {
                                setIsEditing(true);
                                setEditingVariantId(selectedVariantId());
                                if (selectedVariantId()) {
                                  // Initialize variant changes with current variant data
                                  const variant = variants()?.find(v => v.id === selectedVariantId());
                                  if (variant) {
                                    const { id, recipeId, name, description, createdAt, updatedAt, ...changes } = variant;
                                    setVariantChanges(changes);
                                  }
                                } else {
                                  setVariantChanges({});
                                }
                              }}
                              class="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm whitespace-nowrap"
                            >
                              Edit Recipe
                            </button>
                          }
                       >
                         <div class="flex gap-2 flex-wrap">
                           <button
                             onClick={() => {
                               setIsEditing(false);
                               setEditingVariantId(null);
                               setVariantChanges({});
                             }}
                             class="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm whitespace-nowrap"
                           >
                             Cancel
                           </button>
                           <button
                             onClick={editingVariantId() ? handleSaveVariant : handleSave}
                             disabled={saving()}
                             class="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 text-sm whitespace-nowrap"
                           >
                             {saving() ? "Saving..." : editingVariantId() ? "Save Variant" : "Save Recipe"}
                           </button>
                         </div>
                       </Show>
                      </Show>

                      {/* Save button for new recipes */}
                      <Show when={isNewRecipe()}>
                        <div class="flex gap-2 flex-wrap">
                           <button
                             onClick={handleSave}
                             disabled={saving()}
                             class="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 text-sm whitespace-nowrap"
                           >
                             {saving() ? "Saving..." : "Save Recipe"}
                           </button>
                        </div>
                      </Show>

                    <Show when={!isNewRecipe() && !isEditing()}>
                       <div class="flex gap-2 flex-wrap">
                         <Show when={!isOwnRecipe()}>
                           <button
                             onClick={openForkDialog}
                             class="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm whitespace-nowrap"
                           >
                             Fork Recipe
                           </button>
                         </Show>
                         <Show when={isOwnRecipe()}>
                           <button
                             onClick={handleDelete}
                             class="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm whitespace-nowrap"
                           >
                             Delete
                           </button>
                         </Show>
                       </div>
                     </Show>
                  </div>
                </div>
              </div>

              <Show when={error()}>
                <div class="mt-4 text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  {error()}
                </div>
              </Show>
            </div>

            <div class="p-6">
              <div class="space-y-8">
                <div>
                   <div class="space-y-8">
                     <div>
                        <div class="mb-4">
                          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                             <h2 class="text-xl font-semibold text-gray-900 dark:text-stone-100">Ingredients</h2>
                            <Show when={!isNewRecipe() && !isEditing()}>
                              <div class="flex items-center gap-2">
                                 <span class="text-sm text-gray-600 dark:text-stone-400 font-medium">Recipe size:</span>
                                 <div class="flex items-center gap-1 border border-gray-300 dark:border-stone-600 rounded-lg overflow-hidden">
                                  <For each={[1, 1.5, 2, 3]}>
                                    {(multiplier) => (
                                      <button
                                        onClick={() => setRecipeMultiplier(multiplier)}
                                         class={`px-3 py-1 text-sm font-medium transition-colors ${
                                           recipeMultiplier() === multiplier
                                             ? "bg-emerald-600 text-white"
                                             : "bg-white dark:bg-stone-700 text-gray-700 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-600"
                                         }`}
                                      >
                                        {multiplier}x
                                      </button>
                                    )}
                                  </For>
                                </div>
                              </div>
                            </Show>
                          </div>
                        </div>
                      <Show
                        when={isEditing()}
                        fallback={
                           <ul class="space-y-2">
                             <For each={currentRecipeData()?.ingredients || []}>
                               {(currentIngredient, index) => {
                                 const originalIngredients = recipe()?.ingredients || [];
                                 const originalIngredient = originalIngredients[index()];
                                 const isModified = selectedVariantId() && isIngredientModified(index());
                                 const currentVariant = getCurrentVariant();
                                 const variantIngredient = currentVariant?.ingredients?.[index()];
                                 
                                 return (
                                   <li class="space-y-1">
                                     <Show
                                       when={isModified}
                                        fallback={
                                          // No variant for this item - show current ingredient normally
                                          <div class="text-gray-700 dark:text-stone-300">
                                <span class="font-medium text-gray-900 dark:text-stone-100">
                                             {currentIngredient.quantity && `${formatFractionWithUnicode(multiplyQuantity(currentIngredient.quantity, recipeMultiplier()))} `}
                                             {currentIngredient.unit && `${currentIngredient.unit} `}
                                           </span>
                                           {currentIngredient.ingredient}
                                            {currentIngredient.notes && <span class="text-gray-500 dark:text-stone-400 italic"> ({currentIngredient.notes})</span>}
                                         </div>
                                       }
                                     >
                                       {/* Variant exists for this item - show original struck through + variant below */}
                                       <div class="text-gray-500 line-through text-sm">
                                         <span class="font-medium">
                                           {originalIngredient?.quantity && `${formatFractionWithUnicode(multiplyQuantity(originalIngredient.quantity, recipeMultiplier()))} `}
                                           {originalIngredient?.unit && `${originalIngredient.unit} `}
                                         </span>
                                         {originalIngredient?.ingredient}
                                         {originalIngredient?.notes && <span class="italic"> ({originalIngredient.notes})</span>}
                                       </div>
                                        <div class="text-gray-700 dark:text-stone-300 font-semibold text-emerald-700 dark:text-emerald-400">
                                         <span class="font-medium">
                                           {variantIngredient?.quantity && `${formatFractionWithUnicode(multiplyQuantity(variantIngredient.quantity, recipeMultiplier()))} `}
                                           {variantIngredient?.unit && `${variantIngredient.unit} `}
                                         </span>
                                         {variantIngredient?.ingredient}
                                          {variantIngredient?.notes && <span class="text-gray-500 dark:text-stone-400 italic"> ({variantIngredient.notes})</span>}
                                       </div>
                                     </Show>
                                   </li>
                                 );
                               }}
                             </For>
                           </ul>
                        }
                      >
                        <Show
                          when={editingVariantId()}
                          fallback={
                            // Editing original recipe - normal inputs
                            <div class="space-y-3">
                               <For each={formData.ingredients}>
                                {(ingredient, index) => (
                                   <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                     <div class="sm:col-span-12 grid grid-cols-6 sm:grid-cols-12 gap-2 items-center">
                                        <input
                                          type="text"
                                          name={`ingredient-${index()}-quantity`}
                                          value={ingredient.quantity || ""}
                                          onInput={(e) => {
                                            updateIngredientField(index(), "quantity", e.currentTarget.value || undefined);
                                          }}
                                          placeholder="Amount"
                                          class="col-span-1 sm:col-span-2 px-2 py-2 text-sm border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                                        />
                                        <input
                                          type="text"
                                          name={`ingredient-${index()}-unit`}
                                          value={ingredient.unit || ""}
                                          onInput={(e) => {
                                            updateIngredientField(index(), "unit", e.currentTarget.value || undefined);
                                          }}
                                          placeholder="Unit"
                                          class="col-span-1 sm:col-span-2 px-2 py-2 text-sm border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                                        />
                                        <input
                                          type="text"
                                          name={`ingredient-${index()}-ingredient`}
                                          value={ingredient.ingredient}
                                          onInput={(e) => {
                                            updateIngredientField(index(), "ingredient", e.currentTarget.value);
                                          }}
                                          placeholder="Ingredient *"
                                          class="col-span-3 sm:col-span-5 px-2 py-2 text-sm border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                                          required
                                        />
                                       <button
                                         type="button"
                                         onClick={() => removeIngredient(index())}
                                          class="col-span-1 px-2 py-2 text-gray-400 dark:text-stone-500 hover:bg-gray-50 dark:hover:bg-stone-600 rounded-lg text-sm"
                                         title="Remove ingredient"
                                       >
                                         ×
                                       </button>
                                     </div>
                                       <input
                                         type="text"
                                         name={`ingredient-${index()}-notes`}
                                         value={ingredient.notes || ""}
                                          onInput={(e) => {
                                            updateIngredientField(index(), "notes", e.currentTarget.value || undefined);
                                          }}
                                         placeholder="Notes (optional)"
                                         class="sm:col-span-11 px-2 py-2 text-sm border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                                       />
                                   </div>
                                )}
                              </For>
                               <button
                                 onClick={addIngredient}
                                 class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium text-sm"
                               >
                                 + Add ingredient
                               </button>
                            </div>
                          }
                        >
                          {/* Editing variant - show original as text + variant inputs */}
                          <div class="space-y-4">
                            <For each={recipe()?.ingredients || []}>
                              {(originalIngredient, index) => {
                                const variantIngredients = variantChanges().ingredients || [];
                                const variantIngredient = variantIngredients[index()];
                                
                                return (
                                   <div class="space-y-2 p-3 border border-gray-200 dark:border-stone-700 rounded-lg">
                                     <div class="text-sm text-gray-600 dark:text-stone-400">
                                       <strong>Original:</strong>{" "}
                                      <span class="font-medium">
                                        {originalIngredient.quantity && `${originalIngredient.quantity} `}
                                        {originalIngredient.unit && `${originalIngredient.unit} `}
                                      </span>
                                      {originalIngredient.ingredient}
                                      {originalIngredient.notes && <span class="italic"> ({originalIngredient.notes})</span>}
                                    </div>

                                    <div class="grid grid-cols-12 gap-2 items-center">
                                       <input
                                         type="text"
                                         value={variantChanges().ingredients?.[index()]?.quantity || ""}
                                          onInput={(e) => updateVariantIngredientField(index(), "quantity", e.currentTarget.value)}
                                         placeholder="Amount"
                                         class="col-span-2 px-2 py-2 text-sm border border-emerald-300 dark:border-emerald-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                                       />
                                       <input
                                         type="text"
                                         value={variantChanges().ingredients?.[index()]?.unit || ""}
                                          onInput={(e) => updateVariantIngredientField(index(), "unit", e.currentTarget.value)}
                                         placeholder="Unit"
                                         class="col-span-2 px-2 py-2 text-sm border border-emerald-300 dark:border-emerald-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                                       />
                                       <input
                                         type="text"
                                         value={variantChanges().ingredients?.[index()]?.ingredient || ""}
                                          onInput={(e) => updateVariantIngredientField(index(), "ingredient", e.currentTarget.value)}
                                         placeholder="Override ingredient"
                                         class="col-span-5 px-2 py-2 text-sm border border-emerald-300 dark:border-emerald-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                                       />
                                       <input
                                         type="text"
                                         value={variantChanges().ingredients?.[index()]?.notes || ""}
                                          onInput={(e) => updateVariantIngredientField(index(), "notes", e.currentTarget.value)}
                                         placeholder="Notes"
                                         class="col-span-2 px-2 py-2 text-sm border border-emerald-300 dark:border-emerald-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                                       />
                                      <button
                                        onClick={() => clearVariantIngredient(index())}
                                         class="col-span-1 px-2 py-2 text-gray-400 dark:text-stone-500 hover:bg-gray-50 dark:hover:bg-stone-600 rounded-lg text-sm"
                                        title="Reset to original"
                                      >
                                        ↺
                                      </button>
                                    </div>
                                  </div>
                                );
                              }}
                            </For>
                          </div>
                        </Show>
                      </Show>
                    </div>

                    <div>
                       <h2 class="text-xl font-semibold text-gray-900 dark:text-stone-100 mb-4">Instructions</h2>
                      <Show
                        when={isEditing()}
                        fallback={
                           <ol class="space-y-3">
                             <For each={currentRecipeData()?.instructions || []}>
                               {(currentInstruction, index) => {
                                 const originalInstructions = recipe()?.instructions || [];
                                 const originalInstruction = originalInstructions[index()];
                                 const isModified = selectedVariantId() && isInstructionModified(index());
                                 const currentVariant = getCurrentVariant();
                                 const variantInstruction = currentVariant?.instructions?.[index()];
                                 
                                 return (
                                   <li class="space-y-1">
                                     <Show
                                       when={isModified}
                                       fallback={
                                         // No variant for this item - show current instruction normally
                                          <div class="text-gray-700 dark:text-stone-300">
                                            <div class="flex items-start gap-2">
                                              <span class="font-medium mr-2 text-emerald-600 dark:text-emerald-400">{currentInstruction.step}.</span>
                                             <div class="flex-1">
                                               <p>{currentInstruction.instruction}</p>
                                                <div class="flex gap-4 mt-1 text-sm text-gray-500 dark:text-stone-400">
                                                 {currentInstruction.time && <span>⏱️ {currentInstruction.time} min</span>}
                                                 {currentInstruction.temperature && <span>🌡️ {currentInstruction.temperature}</span>}
                                               </div>
                                             </div>
                                           </div>
                                         </div>
                                       }
                                     >
                                       {/* Variant exists for this item - show original struck through + variant below */}
                                       <div class="text-gray-500 line-through text-sm">
                                         <div class="flex items-start gap-2">
                                           <span class="font-medium mr-2">{originalInstruction?.step}.</span>
                                           <div class="flex-1">
                                             <p>{originalInstruction?.instruction}</p>
                                             <div class="flex gap-4 mt-1 text-xs">
                                               {originalInstruction?.time && <span>⏱️ {originalInstruction.time} min</span>}
                                               {originalInstruction?.temperature && <span>🌡️ {originalInstruction.temperature}</span>}
                                             </div>
                                           </div>
                                         </div>
                                       </div>
                                        <div class="text-gray-700 dark:text-stone-300 font-semibold">
                                          <div class="flex items-start gap-2">
                                            <span class="font-medium mr-2 text-emerald-600 dark:text-emerald-400">{originalInstruction?.step}.</span>
                                           <div class="flex-1">
                                              <p class="text-emerald-700 dark:text-emerald-400">{variantInstruction?.instruction}</p>
                                              <div class="flex gap-4 mt-1 text-sm text-gray-500 dark:text-stone-400">
                                               {variantInstruction?.time && <span>⏱️ {variantInstruction.time} min</span>}
                                               {variantInstruction?.temperature && <span>🌡️ {variantInstruction.temperature}</span>}
                                             </div>
                                           </div>
                                         </div>
                                       </div>
                                     </Show>
                                   </li>
                                 );
                               }}
                             </For>
                           </ol>
                        }
                      >
                        <Show
                          when={editingVariantId()}
                          fallback={
                            // Editing original recipe - normal inputs
                            <div class="space-y-3">
                               <For each={formData.instructions}>
                                {(instruction, index) => (
                                   <div class="border border-gray-200 dark:border-stone-700 rounded-lg p-4">
                                    <div class="flex flex-wrap items-center gap-2 mb-3">
                                       <span class="font-medium text-emerald-600 dark:text-emerald-400">Step {instruction.step}</span>
                                      <input
                                        type="number"
                                        name={`instruction-${index()}-time`}
                                        value={instruction.time || ""}
                                         onInput={(e) => {
                                           updateInstructionField(index(), "time", e.currentTarget.value ? parseInt(e.currentTarget.value) : undefined);
                                         }}
                                        placeholder="Time (min)"
                                         class="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-stone-600 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                                      />
                                      <input
                                        type="text"
                                        name={`instruction-${index()}-temperature`}
                                        value={instruction.temperature || ""}
                                         onInput={(e) => {
                                           updateInstructionField(index(), "temperature", e.currentTarget.value || undefined);
                                         }}
                                        placeholder="Temp"
                                         class="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-stone-600 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeInstruction(index())}
                                         class="ml-auto px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-sm"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    <textarea
                                      name={`instruction-${index()}-instruction`}
                                      value={instruction.instruction}
                                       onInput={(e) => {
                                         updateInstructionField(index(), "instruction", e.currentTarget.value);
                                       }}
                                      placeholder="Enter instruction"
                                       class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                                      rows="3"
                                    />
                                  </div>
                                )}
                              </For>
                               <button
                                 onClick={addInstruction}
                                 class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium text-sm"
                               >
                                 + Add instruction
                               </button>
                            </div>
                          }
                        >
                          {/* Editing variant - show original as text + variant inputs */}
                          <div class="space-y-4">
                            <For each={recipe()?.instructions || []}>
                              {(originalInstruction, index) => {
                                const variantInstructions = variantChanges().instructions || [];
                                const variantInstruction = variantInstructions[index()];
                                
                                return (
                                   <div class="space-y-2 p-4 border border-gray-200 dark:border-stone-700 rounded-lg">
                                     <div class="text-sm text-gray-600 dark:text-stone-400">
                                       <strong>Original Step {originalInstruction.step}:</strong>{" "}
                                      {originalInstruction.instruction}
                                      <div class="flex gap-4 mt-1 text-xs">
                                        {originalInstruction.time && <span>⏱️ {originalInstruction.time} min</span>}
                                        {originalInstruction.temperature && <span>🌡️ {originalInstruction.temperature}</span>}
                                      </div>
                                    </div>

                                    <div class="space-y-2">
                                      <div class="flex flex-wrap items-center gap-2">
                                         <span class="font-medium text-emerald-600 dark:text-emerald-400">Variant Step {originalInstruction.step}</span>
                                        <input
                                          type="number"
                                          value={variantChanges().instructions?.[index()]?.time || ""}
                                           onInput={(e) => updateVariantInstructionField(index(), "time", parseInt(e.currentTarget.value) || undefined)}
                                          placeholder="Time (min)"
                                           class="w-20 px-2 py-1 text-sm border border-emerald-300 dark:border-emerald-600 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                                        />
                                        <input
                                          type="text"
                                          value={variantChanges().instructions?.[index()]?.temperature || ""}
                                           onInput={(e) => updateVariantInstructionField(index(), "temperature", e.currentTarget.value)}
                                          placeholder="Temp"
                                           class="w-16 px-2 py-1 text-sm border border-emerald-300 dark:border-emerald-600 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                                        />
                                        <button
                                          onClick={() => clearVariantInstruction(index())}
                                           class="ml-auto px-2 py-1 text-gray-400 dark:text-stone-500 hover:bg-gray-50 dark:hover:bg-stone-600 rounded text-sm"
                                          title="Reset to original"
                                        >
                                          ↺
                                        </button>
                                      </div>
                                      <textarea
                                        value={variantChanges().instructions?.[index()]?.instruction || ""}
                                         onInput={(e) => updateVariantInstructionField(index(), "instruction", e.currentTarget.value)}
                                        placeholder="Override instruction"
                                         class="w-full px-3 py-2 text-sm border border-emerald-300 dark:border-emerald-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none bg-emerald-50 dark:bg-emerald-900/20 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                                        rows="3"
                                      />
                                    </div>
                                  </div>
                                );
                              }}
                            </For>
                          </div>
                        </Show>
                      </Show>
                    </div>
                  </div>
                </div>

                <div class="space-y-6">
                   <Show when={formData.imageUrl && !isEditing()}>
                    <img
                       src={formData.imageUrl}
                       alt={formData.title}
                      class="w-full rounded-lg shadow-md"
                    />
                  </Show>

                  <Show when={isEditing()}>
                     <div class="bg-gray-50 dark:bg-stone-800 rounded-lg p-4">
                       <label class="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
                         Image URL
                       </label>
                       <input
                         type="url"
                          value={formData.imageUrl || ""}
                          onInput={(e) => updateFormField("imageUrl", e.currentTarget.value)}
                         placeholder="https://example.com/image.jpg"
                         class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                       />
                    </div>
                  </Show>

                   <div class="bg-gray-50 dark:bg-stone-800 rounded-lg p-4 space-y-4">
                     <h3 class="font-semibold text-gray-900 dark:text-stone-100">Recipe Details</h3>
                    
                    <Show
                      when={isEditing()}
                      fallback={
                        <div class="space-y-2 text-sm">
                            <Show when={formData.servings}>
                             <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-stone-400">Servings:</span>
                                <span class="font-medium text-gray-900 dark:text-stone-100">
                                   {Math.round((formData.servings || 0) * recipeMultiplier())}
                                 <Show when={recipeMultiplier() !== 1}>
                                    <span class="text-xs text-gray-500 dark:text-stone-400 ml-1">
                                      (originally {formData.servings})
                                   </span>
                                 </Show>
                               </span>
                             </div>
                           </Show>
                           <Show when={formData.prepTime}>
                            <div class="flex justify-between">
                               <span class="text-gray-600 dark:text-stone-400">Prep Time:</span>
                                <span class="font-medium text-gray-900 dark:text-stone-100">{formatTime(formData.prepTime)}</span>
                            </div>
                          </Show>
                           <Show when={formData.cookTime}>
                            <div class="flex justify-between">
                               <span class="text-gray-600 dark:text-stone-400">Cook Time:</span>
                                <span class="font-medium text-gray-900 dark:text-stone-100">{formatTime(formData.cookTime)}</span>
                            </div>
                          </Show>
                           <Show when={formData.difficulty}>
                            <div class="flex justify-between">
                               <span class="text-gray-600 dark:text-stone-400">Difficulty:</span>
                                <span class="font-medium text-gray-900 dark:text-stone-100">{formData.difficulty}</span>
                            </div>
                          </Show>
                           <Show when={formData.cuisine}>
                            <div class="flex justify-between">
                               <span class="text-gray-600 dark:text-stone-400">Cuisine:</span>
                                <span class="font-medium text-gray-900 dark:text-stone-100">{formData.cuisine}</span>
                            </div>
                          </Show>
                        </div>
                      }
                    >
                      <div class="grid grid-cols-2 gap-3">
                         <div>
                           <label class="block text-xs font-medium text-gray-700 dark:text-stone-300 mb-1">
                             Servings
                           </label>
                          <Show 
                            when={editingVariantId()}
                            fallback={
                              <input
                                type="number"
                                 value={formData.servings || ""}
                                 onInput={(e) => updateFormField("servings", parseInt(e.currentTarget.value) || undefined)}
                                 class="w-full px-2 py-2 text-sm border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100"
                              />
                            }
                          >
                            <div class="space-y-2">
                               <div class="px-2 py-2 text-sm bg-gray-100 dark:bg-stone-700 rounded border border-gray-200 dark:border-stone-600">
                                 <span class="text-gray-600 dark:text-stone-400">Original: </span>
                                 <span class="font-medium text-gray-900 dark:text-stone-100">{recipe()?.servings || "Not set"}</span>
                              </div>
                              <input
                                type="number"
                                value={variantChanges().servings || ""}
                                onInput={(e) => updateVariantFormField("servings", parseInt(e.currentTarget.value) || undefined)}
                                placeholder="Override with variant value"
                                 class="w-full px-2 py-2 text-sm border border-emerald-300 dark:border-emerald-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                              />
                            </div>
                          </Show>
                        </div>
                        
                         <div>
                           <label class="block text-xs font-medium text-gray-700 dark:text-stone-300 mb-1">
                             Prep (min)
                           </label>
                           <input
                             type="number"
                              value={formData.prepTime || ""}
                              onInput={(e) => updateFormField("prepTime", parseInt(e.currentTarget.value) || undefined)}
                             class="w-full px-2 py-2 text-sm border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100"
                           />
                        </div>
                        
                         <div>
                           <label class="block text-xs font-medium text-gray-700 dark:text-stone-300 mb-1">
                             Cook (min)
                           </label>
                           <input
                             type="number"
                              value={formData.cookTime || ""}
                              onInput={(e) => updateFormField("cookTime", parseInt(e.currentTarget.value) || undefined)}
                             class="w-full px-2 py-2 text-sm border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100"
                           />
                        </div>
                        
                         <div>
                           <label class="block text-xs font-medium text-gray-700 dark:text-stone-300 mb-1">
                             Difficulty
                           </label>
                           <select
                              value={formData.difficulty || ""}
                              onChange={(e) => updateFormField("difficulty", e.currentTarget.value || undefined)}
                             class="w-full px-2 py-2 text-sm border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100"
                           >
                            <option value="">Select</option>
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                          </select>
                        </div>
                        
                         <div class="col-span-2">
                           <label class="block text-xs font-medium text-gray-700 dark:text-stone-300 mb-1">
                             Cuisine
                           </label>
                           <input
                             type="text"
                              value={formData.cuisine || ""}
                              onInput={(e) => updateFormField("cuisine", e.currentTarget.value || undefined)}
                             placeholder="e.g., Italian, Mexican, Asian"
                             class="w-full px-2 py-2 text-sm border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                           />
                        </div>
                      </div>
                    </Show>
                  </div>

                   <div class="bg-gray-50 dark:bg-stone-800 rounded-lg p-4">
                     <h3 class="font-semibold text-gray-900 dark:text-stone-100 mb-3">Tags</h3>
                    
                    <Show when={isEditing()}>
                      <div class="mb-3">
                        <div class="flex gap-2">
                          <input
                            type="text"
                            value={newTagName()}
                            onInput={(e) => setNewTagName(e.currentTarget.value)}
                            placeholder="Create new tag"
                             class="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-stone-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                createTag();
                              }
                            }}
                          />
                          <button
                            onClick={createTag}
                            disabled={!newTagName().trim() || creatingTag()}
                            class="px-3 py-1 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {creatingTag() ? "..." : "Add"}
                          </button>
                        </div>
                      </div>
                    </Show>

                    <Show
                      when={isEditing()}
                      fallback={
                        <Show 
                           when={formData.tags && formData.tags.length > 0}
                          fallback={                           <p class="text-sm text-gray-500 dark:text-stone-400 italic">No tags assigned</p>}
                        >
                          <div class="flex flex-wrap gap-2">
                             <For each={formData.tags?.filter(tag => tag && tag.id && tag.name) || []}>
                              {(tag) => (
                                <span
                                  class="px-2 py-1 rounded-full text-xs text-white"
                                  style={{ "background-color": tag.color }}
                                >
                                  {tag.name}
                                </span>
                              )}
                            </For>
                          </div>
                        </Show>
                      }
                    >
                      <Show 
                        when={tags()}
                        fallback={                         <p class="text-sm text-gray-500 dark:text-stone-400">Loading tags...</p>}
                      >
                        <div class="flex flex-wrap gap-2">
                          <For each={tags()?.filter(tag => tag && tag.id && tag.name) || []}>
                            {(tag) => {
                               const isSelected = () => formData.tags?.some(t => t && t.id === tag.id) || false;
                              return (
                                <button
                                  onClick={() => toggleTag(tag)}
                                  class={`px-2 py-1 rounded-full text-xs transition-colors ${
                                    isSelected()
                                      ? "text-white"
                                      : "bg-gray-200 dark:bg-stone-600 text-gray-700 dark:text-stone-300 hover:bg-gray-300 dark:hover:bg-stone-500"
                                  }`}
                                  style={{ "background-color": isSelected() ? tag.color : undefined }}
                                >
                                  {tag.name}
                                </button>
                              );
                            }}
                          </For>
                        </div>
                      </Show>
                    </Show>

                  </div>

                   <Show when={formData.sourceUrl && !isEditing()}>
                     <div class="bg-gray-50 dark:bg-stone-800 rounded-lg p-4">
                       <h3 class="font-semibold text-gray-900 dark:text-stone-100 mb-2">Source</h3>
                      <a
                         href={formData.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                         class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm break-all"
                      >
                        View Original Recipe ↗
                      </a>
                    </div>
                  </Show>

                  <Show when={isEditing()}>
                     <div class="bg-gray-50 dark:bg-stone-800 rounded-lg p-4">
                       <label class="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
                         Source URL
                       </label>
                      <input
                        type="url"
                         value={formData.sourceUrl || ""}
                         onInput={(e) => updateFormField("sourceUrl", e.currentTarget.value || undefined)}
                        placeholder="https://example.com/recipe"
                         class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                      />
                    </div>
                  </Show>
                </div>
              </div>
            </div>
          </div>
        </Show>

        {/* Create New Variant Dialog */}
        <Show when={showCreateVariantDialog()}>
          <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
             <div class="bg-white dark:bg-stone-800 rounded-lg shadow-xl max-w-sm w-full p-6">
               <h2 class="text-xl font-bold text-gray-900 dark:text-stone-100 mb-4">Create New Variant</h2>
              
              <div class="space-y-4">
                <input
                  type="text"
                  placeholder="Variant name (e.g., Vegan Version)"
                  value={newVariantName()}
                  onInput={(e) => setNewVariantName(e.currentTarget.value)}
                   class="w-full px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && newVariantName().trim()) {
                      handleCreateVariant();
                    }
                  }}
                />

                <div class="flex gap-3">
                  <button
                    onClick={handleCreateVariant}
                    disabled={!newVariantName().trim()}
                    class="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateVariantDialog(false);
                      setNewVariantName("");
                    }}
                     class="px-4 py-2 bg-gray-300 dark:bg-stone-600 text-gray-700 dark:text-stone-300 rounded-lg hover:bg-gray-400 dark:hover:bg-stone-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Show>

        {/* Fork Recipe Dialog */}
        <Show when={showForkDialog()}>
          <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
             <div class="bg-white dark:bg-stone-800 rounded-lg shadow-xl max-w-md w-full p-6">
               <h2 class="text-xl font-bold text-gray-900 dark:text-stone-100 mb-4">Fork Recipe</h2>
               <p class="text-gray-600 dark:text-stone-400 mb-4">
                This will create a copy of this recipe in your personal collection that you can edit independently.
              </p>
              
              <div class="space-y-4">
                <div>
                   <label for="forkTitle" class="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
                    Recipe Title
                  </label>
                  <input
                    id="forkTitle"
                    type="text"
                    placeholder="Enter title for your copy"
                    value={forkTitle()}
                    onInput={(e) => setForkTitle(e.currentTarget.value)}
                     class="w-full px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && forkTitle().trim()) {
                        handleFork();
                      }
                    }}
                  />
                </div>

                <div class="flex gap-3">
                  <button
                    onClick={handleFork}
                    disabled={!forkTitle().trim() || isForking()}
                    class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isForking() ? "Forking..." : "Fork Recipe"}
                  </button>
                  <button
                    onClick={() => {
                      setShowForkDialog(false);
                      setForkTitle("");
                    }}
                    disabled={isForking()}
                     class="px-4 py-2 bg-gray-300 dark:bg-stone-600 text-gray-700 dark:text-stone-300 rounded-lg hover:bg-gray-400 dark:hover:bg-stone-500 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
         </Show>
        </PageLayout>
      ) : null}
    </>
  );
}