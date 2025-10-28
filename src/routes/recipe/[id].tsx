import { Title } from "@solidjs/meta";
import { Show, createSignal, createResource, For, createEffect } from "solid-js";
import { useAuth } from "~/lib/auth-context";
import { useNavigate, useParams, useSearchParams } from "@solidjs/router";
import { multiplyQuantity, formatFractionWithUnicode } from "~/lib/fraction-utils";
import { useConfirm, useToast } from "~/lib/notifications";
import PageLayout from "~/components/PageLayout";
import Breadcrumbs from "~/components/Breadcrumbs";

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const confirm = useConfirm();
  const toast = useToast();
  
  const [isEditing, setIsEditing] = createSignal(false);
  const [formData, setFormData] = createSignal<Partial<Recipe>>({});
  const [error, setError] = createSignal("");
  const [saving, setSaving] = createSignal(false);
  
  // Variant state
  const [selectedVariantId, setSelectedVariantId] = createSignal<string | null>(null);
  const [editingVariantId, setEditingVariantId] = createSignal<string | null>(null);
  const [variantChanges, setVariantChanges] = createSignal<Partial<RecipeVariant>>({});
  const [showCreateVariantDialog, setShowCreateVariantDialog] = createSignal(false);
  const [newVariantName, setNewVariantName] = createSignal("");

  // Recipe multiplier state
  const [recipeMultiplier, setRecipeMultiplier] = createSignal(1);

  // Fork state
  const [isForking, setIsForking] = createSignal(false);
  const [showForkDialog, setShowForkDialog] = createSignal(false);
  const [forkTitle, setForkTitle] = createSignal("");

  if (!user()) {
    navigate("/login");
    return null;
  }

  const [recipe, { refetch }] = createResource(() => params.id, async (id) => {
    if (id === "new") return null;
    const response = await fetch(`/api/recipes/${id}`);
    if (!response.ok) throw new Error("Recipe not found");
    const data = await response.json();
    return data.recipe as Recipe;
  });

  const [tags, { refetch: refetchTags }] = createResource(async () => {
    const response = await fetch("/api/tags");
    if (!response.ok) throw new Error("Failed to fetch tags");
    const data = await response.json();
    return data.tags as Tag[];
  });

  const [variants, { refetch: refetchVariants }] = createResource(() => params.id, async (id) => {
    if (id === "new") return [];
    const response = await fetch(`/api/recipes/${id}/variants`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.variants as RecipeVariant[];
  });

  // Fetch cookbook data if coming from a cookbook
  const [sourceCookbook, { refetch: refetchCookbook }] = createResource(() => {
    const cookbookId = searchParams.cookbookId;
    return cookbookId;
  }, async (cookbookId) => {
    if (!cookbookId) return null;
    const response = await fetch(`/api/cookbooks/${cookbookId}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.cookbook;
  });

  // Computed signal for the current recipe data (base or variant)
  const currentRecipeData = () => {
    const base = recipe();
    if (!base) return formData();
    
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
    // Collect ingredients from form inputs
    const ingredients: RecipeIngredient[] = [];
    const currentIngredients = formData().ingredients || [];
    currentIngredients.forEach((_, index) => {
      const quantityInput = document.querySelector(`input[name="ingredient-${index}-quantity"]`) as HTMLInputElement;
      const unitInput = document.querySelector(`input[name="ingredient-${index}-unit"]`) as HTMLInputElement;
      const ingredientInput = document.querySelector(`input[name="ingredient-${index}-ingredient"]`) as HTMLInputElement;
      const notesInput = document.querySelector(`input[name="ingredient-${index}-notes"]`) as HTMLInputElement;
      
      const ingredient = ingredientInput?.value?.trim();
      if (ingredient) {
        ingredients.push({
          quantity: quantityInput?.value || undefined,
          unit: unitInput?.value || undefined,
          ingredient: ingredient,
          notes: notesInput?.value || undefined,
        });
      }
    });

    // Collect instructions from form inputs
    const instructions: RecipeInstruction[] = [];
    const currentInstructions = formData().instructions || [];
    currentInstructions.forEach((instruction, index) => {
      const timeInput = document.querySelector(`input[name="instruction-${index}-time"]`) as HTMLInputElement;
      const temperatureInput = document.querySelector(`input[name="instruction-${index}-temperature"]`) as HTMLInputElement;
      const instructionInput = document.querySelector(`textarea[name="instruction-${index}-instruction"]`) as HTMLTextAreaElement;
      
      const instructionText = instructionInput?.value?.trim();
      if (instructionText) {
        instructions.push({
          step: instruction.step,
          instruction: instructionText,
          time: timeInput?.value ? parseInt(timeInput.value) : undefined,
          temperature: temperatureInput?.value || undefined,
        });
      }
    });

    return {
      ...formData(),
      ingredients,
      instructions,
      tagIds: formData().tags?.map(t => t.id) || [],
    };
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const data = collectFormData();
      console.log("Saving recipe with tags:", data.tags);
      console.log("Saving recipe with tagIds:", data.tagIds);
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
    const currentTitle = formData().title || "Untitled Recipe";
    setForkTitle(`${currentTitle} (Copy)`);
    setShowForkDialog(true);
  };

  const isOwnRecipe = () => {
    const currentRecipe = recipe();
    return currentRecipe && currentRecipe.userId === user()?.id;
  };

  const addIngredient = () => {
    const current = formData();
    setFormData({
      ...current,
      ingredients: [...(current.ingredients || []), { ingredient: "" }],
    });
  };

  const removeIngredient = (index: number) => {
    const current = formData();
    setFormData({
      ...current,
      ingredients: current.ingredients?.filter((_, i) => i !== index) || [],
    });
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: string) => {
    const current = formData();
    const ingredients = [...(current.ingredients || [])];
    ingredients[index] = { ...ingredients[index], [field]: value };
    setFormData({ ...current, ingredients });
  };

  const addInstruction = () => {
    const current = formData();
    const newStep = (current.instructions?.length || 0) + 1;
    setFormData({
      ...current,
      instructions: [...(current.instructions || []), { step: newStep, instruction: "" }],
    });
  };

  const removeInstruction = (index: number) => {
    const current = formData();
    const newInstructions = current.instructions?.filter((_, i) => i !== index) || [];
    // Renumber steps
    const renumberedInstructions = newInstructions.map((inst, i) => ({ ...inst, step: i + 1 }));
    setFormData({
      ...current,
      instructions: renumberedInstructions,
    });
  };

  const updateInstruction = (index: number, field: keyof RecipeInstruction, value: string | number) => {
    const current = formData();
    const instructions = [...(current.instructions || [])];
    instructions[index] = { ...instructions[index], [field]: value };
    setFormData({ ...current, instructions });
  };

  // Variant ingredient helpers
  const updateVariantIngredient = (index: number, field: keyof RecipeIngredient, value: string) => {
    const currentChanges = variantChanges();
    const variantIngredients = [...(currentChanges.ingredients || [])];
    
    // Ensure we have an array that's at least as long as the original
    const originalLength = recipe()?.ingredients?.length || 0;
    while (variantIngredients.length <= index) {
      variantIngredients.push({ ingredient: "" });
    }
    
    // Update the specific field
    variantIngredients[index] = { ...variantIngredients[index], [field]: value };
    
    setVariantChanges({ ...currentChanges, ingredients: variantIngredients });
  };

  const clearVariantIngredient = (index: number) => {
    const currentChanges = variantChanges();
    const variantIngredients = [...(currentChanges.ingredients || [])];
    
    if (index < variantIngredients.length) {
      variantIngredients[index] = { ingredient: "" };
      setVariantChanges({ ...currentChanges, ingredients: variantIngredients });
    }
  };

  // Variant instruction helpers
  const updateVariantInstruction = (index: number, field: keyof RecipeInstruction, value: string | number) => {
    const currentChanges = variantChanges();
    const variantInstructions = [...(currentChanges.instructions || [])];
    
    // Ensure we have an array that's at least as long as the original
    const originalLength = recipe()?.instructions?.length || 0;
    while (variantInstructions.length <= index) {
      variantInstructions.push({ step: variantInstructions.length + 1, instruction: "" });
    }
    
    // Update the specific field
    variantInstructions[index] = { ...variantInstructions[index], [field]: value };
    
    setVariantChanges({ ...currentChanges, instructions: variantInstructions });
  };

  const clearVariantInstruction = (index: number) => {
    const currentChanges = variantChanges();
    const variantInstructions = [...(currentChanges.instructions || [])];
    
    if (index < variantInstructions.length) {
      variantInstructions[index] = { step: index + 1, instruction: "" };
      setVariantChanges({ ...currentChanges, instructions: variantInstructions });
    }
  };

  const toggleTag = (tag: Tag) => {
    if (!tag || !tag.id) return;
    
    const current = formData();
    const currentTags = (current.tags || []).filter(t => t && t.id); // Filter out invalid tags
    const isSelected = currentTags.some(t => t.id === tag.id);
    
    if (isSelected) {
      setFormData({
        ...current,
        tags: currentTags.filter(t => t.id !== tag.id),
      });
    } else {
      setFormData({
        ...current,
        tags: [...currentTags, tag],
      });
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
      const current = formData();
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
    const recipeTitle = formData().title || "Recipe";

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
    <PageLayout
      title={isNewRecipe() ? "New Recipe" : formData().title || "Recipe"}
      breadcrumbs={<Breadcrumbs items={breadcrumbItems()} />}
    >
      <Title>{isNewRecipe() ? "New Recipe" : formData().title || "Recipe"} - Recipe Curator</Title>
        <Show when={recipe.loading && !isNewRecipe()}>
          <div class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <p class="mt-2 text-gray-600">Loading recipe...</p>
          </div>
        </Show>

        <Show when={recipe.error}>
          <div class="text-center py-8">
            <p class="text-red-600">Error loading recipe: {recipe.error.message}</p>
          </div>
        </Show>

        <Show when={formData().title !== undefined || isNewRecipe()}>
          <div class="bg-white rounded-lg shadow-lg overflow-hidden">
            <div class="p-6 border-b">
              <div class="space-y-4">
                {/* Title and Variant Selector */}
                <Show
                  when={isEditing()}
                  fallback={
                    <div>
                       <div class="flex items-center gap-4 mb-2">
                         <h1 class="text-3xl font-bold text-gray-900">{formData().title}</h1>
                         <Show when={!isNewRecipe() && variants() && variants()!.length > 0}>
                           <select
                             value={selectedVariantId() || ""}
                             onChange={(e) => setSelectedVariantId(e.currentTarget.value || null)}
                             class="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                      <Show when={formData().description}>
                        <p class="text-gray-600 text-lg">{formData().description}</p>
                      </Show>
                    </div>
                  }
                >
                  <div class="space-y-4">
                    <input
                      type="text"
                      name="title"
                      placeholder="Recipe title"
                      value={formData().title || ""}
                      onInput={(e) => setFormData({ ...formData(), title: e.currentTarget.value })}
                      class="text-3xl font-bold text-gray-900 w-full border-none outline-none bg-transparent placeholder-gray-400"
                      disabled={editingVariantId() !== null} // Can't edit title in variant mode
                    />
                    <textarea
                      name="description"
                      placeholder="Recipe description (optional)"
                      value={formData().description || ""}
                      onInput={(e) => setFormData({ ...formData(), description: e.currentTarget.value })}
                      class="text-gray-600 text-lg w-full border-none outline-none bg-transparent placeholder-gray-400 resize-none"
                      rows="2"
                      disabled={editingVariantId() !== null} // Can't edit description in variant mode for now
                    />
                  </div>
                </Show>

                {/* Action Bar - Separate row for controls */}
                <div class="flex justify-between items-center pt-2 border-t border-gray-100">
                  <Show when={isEditing() && !isNewRecipe()}>
                    <div class="flex items-center gap-2">
                      <label class="text-sm font-medium text-gray-700">Editing:</label>
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
                        class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                <div class="mt-4 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {error()}
                </div>
              </Show>
            </div>

            <div class="p-6">
              <div class="space-y-8">
                <div>
                   <div class="space-y-8">
                     <div>
                       <div class="flex items-center justify-between mb-4">
                         <h2 class="text-xl font-semibold text-gray-900">Ingredients</h2>
                         <Show when={!isNewRecipe() && !isEditing()}>
                           <div class="flex items-center gap-2">
                             <span class="text-sm text-gray-600 font-medium">Recipe size:</span>
                             <div class="flex items-center gap-1 border border-gray-300 rounded-lg overflow-hidden">
                               <For each={[1, 1.5, 2, 3]}>
                                 {(multiplier) => (
                                   <button
                                     onClick={() => setRecipeMultiplier(multiplier)}
                                     class={`px-3 py-1 text-sm font-medium transition-colors ${
                                       recipeMultiplier() === multiplier
                                         ? "bg-emerald-600 text-white"
                                         : "bg-white text-gray-700 hover:bg-gray-50"
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
                                         <div class="text-gray-700">
                                           <span class="font-medium">
                                             {currentIngredient.quantity && `${formatFractionWithUnicode(multiplyQuantity(currentIngredient.quantity, recipeMultiplier()))} `}
                                             {currentIngredient.unit && `${currentIngredient.unit} `}
                                           </span>
                                           {currentIngredient.ingredient}
                                           {currentIngredient.notes && <span class="text-gray-500 italic"> ({currentIngredient.notes})</span>}
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
                                       <div class="text-gray-700 font-semibold text-emerald-700">
                                         <span class="font-medium">
                                           {variantIngredient?.quantity && `${formatFractionWithUnicode(multiplyQuantity(variantIngredient.quantity, recipeMultiplier()))} `}
                                           {variantIngredient?.unit && `${variantIngredient.unit} `}
                                         </span>
                                         {variantIngredient?.ingredient}
                                         {variantIngredient?.notes && <span class="text-gray-500 italic"> ({variantIngredient.notes})</span>}
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
                              <For each={formData().ingredients}>
                                {(ingredient, index) => (
                                   <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                     <div class="sm:col-span-12 grid grid-cols-6 sm:grid-cols-12 gap-2 items-center">
                                       <input
                                         type="text"
                                         name={`ingredient-${index()}-quantity`}
                                         value={ingredient.quantity || ""}
                                         placeholder="Amount"
                                         class="col-span-1 sm:col-span-2 px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                       />
                                       <input
                                         type="text"
                                         name={`ingredient-${index()}-unit`}
                                         value={ingredient.unit || ""}
                                         placeholder="Unit"
                                         class="col-span-1 sm:col-span-2 px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                       />
                                       <input
                                         type="text"
                                         name={`ingredient-${index()}-ingredient`}
                                         value={ingredient.ingredient}
                                         placeholder="Ingredient *"
                                         class="col-span-3 sm:col-span-5 px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                         required
                                       />
                                       <button
                                         type="button"
                                         onClick={() => removeIngredient(index())}
                                         class="col-span-1 px-2 py-2 text-gray-400 hover:bg-gray-50 rounded-lg text-sm"
                                         title="Remove ingredient"
                                       >
                                         ×
                                       </button>
                                     </div>
                                     <input
                                       type="text"
                                       name={`ingredient-${index()}-notes`}
                                       value={ingredient.notes || ""}
                                       placeholder="Notes (optional)"
                                       class="sm:col-span-11 px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                     />
                                   </div>
                                )}
                              </For>
                              <button
                                onClick={addIngredient}
                                class="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
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
                                  <div class="space-y-2 p-3 border border-gray-200 rounded-lg">
                                    <div class="text-sm text-gray-600">
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
                                        onInput={(e) => updateVariantIngredient(index(), "quantity", e.currentTarget.value)}
                                        placeholder="Amount"
                                        class="col-span-2 px-2 py-2 text-sm border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50"
                                      />
                                      <input
                                        type="text"
                                        value={variantChanges().ingredients?.[index()]?.unit || ""}
                                        onInput={(e) => updateVariantIngredient(index(), "unit", e.currentTarget.value)}
                                        placeholder="Unit"
                                        class="col-span-2 px-2 py-2 text-sm border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50"
                                      />
                                      <input
                                        type="text"
                                        value={variantChanges().ingredients?.[index()]?.ingredient || ""}
                                        onInput={(e) => updateVariantIngredient(index(), "ingredient", e.currentTarget.value)}
                                        placeholder="Override ingredient"
                                        class="col-span-5 px-2 py-2 text-sm border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50"
                                      />
                                      <input
                                        type="text"
                                        value={variantChanges().ingredients?.[index()]?.notes || ""}
                                        onInput={(e) => updateVariantIngredient(index(), "notes", e.currentTarget.value)}
                                        placeholder="Notes"
                                        class="col-span-2 px-2 py-2 text-sm border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50"
                                      />
                                      <button
                                        onClick={() => clearVariantIngredient(index())}
                                        class="col-span-1 px-2 py-2 text-gray-400 hover:bg-gray-50 rounded-lg text-sm"
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
                      <h2 class="text-xl font-semibold text-gray-900 mb-4">Instructions</h2>
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
                                         <div class="text-gray-700">
                                           <div class="flex items-start gap-2">
                                             <span class="font-medium mr-2 text-emerald-600">{currentInstruction.step}.</span>
                                             <div class="flex-1">
                                               <p>{currentInstruction.instruction}</p>
                                               <div class="flex gap-4 mt-1 text-sm text-gray-500">
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
                                       <div class="text-gray-700 font-semibold">
                                         <div class="flex items-start gap-2">
                                           <span class="font-medium mr-2 text-emerald-600">{originalInstruction?.step}.</span>
                                           <div class="flex-1">
                                             <p class="text-emerald-700">{variantInstruction?.instruction}</p>
                                             <div class="flex gap-4 mt-1 text-sm text-gray-500">
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
                              <For each={formData().instructions}>
                                {(instruction, index) => (
                                  <div class="border border-gray-200 rounded-lg p-4">
                                    <div class="flex flex-wrap items-center gap-2 mb-3">
                                      <span class="font-medium text-emerald-600">Step {instruction.step}</span>
                                      <input
                                        type="number"
                                        name={`instruction-${index()}-time`}
                                        value={instruction.time || ""}
                                        placeholder="Time (min)"
                                        class="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                      />
                                      <input
                                        type="text"
                                        name={`instruction-${index()}-temperature`}
                                        value={instruction.temperature || ""}
                                        placeholder="Temp"
                                        class="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeInstruction(index())}
                                        class="ml-auto px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    <textarea
                                      name={`instruction-${index()}-instruction`}
                                      value={instruction.instruction}
                                      placeholder="Enter instruction"
                                      class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                      rows="3"
                                    />
                                  </div>
                                )}
                              </For>
                              <button
                                onClick={addInstruction}
                                class="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
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
                                  <div class="space-y-2 p-4 border border-gray-200 rounded-lg">
                                    <div class="text-sm text-gray-600">
                                      <strong>Original Step {originalInstruction.step}:</strong>{" "}
                                      {originalInstruction.instruction}
                                      <div class="flex gap-4 mt-1 text-xs">
                                        {originalInstruction.time && <span>⏱️ {originalInstruction.time} min</span>}
                                        {originalInstruction.temperature && <span>🌡️ {originalInstruction.temperature}</span>}
                                      </div>
                                    </div>

                                    <div class="space-y-2">
                                      <div class="flex flex-wrap items-center gap-2">
                                        <span class="font-medium text-emerald-600">Variant Step {originalInstruction.step}</span>
                                        <input
                                          type="number"
                                          value={variantChanges().instructions?.[index()]?.time || ""}
                                          onInput={(e) => updateVariantInstruction(index(), "time", parseInt(e.currentTarget.value) || undefined)}
                                          placeholder="Time (min)"
                                          class="w-20 px-2 py-1 text-sm border border-emerald-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-emerald-50"
                                        />
                                        <input
                                          type="text"
                                          value={variantChanges().instructions?.[index()]?.temperature || ""}
                                          onInput={(e) => updateVariantInstruction(index(), "temperature", e.currentTarget.value)}
                                          placeholder="Temp"
                                          class="w-16 px-2 py-1 text-sm border border-emerald-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-emerald-50"
                                        />
                                        <button
                                          onClick={() => clearVariantInstruction(index())}
                                          class="ml-auto px-2 py-1 text-gray-400 hover:bg-gray-50 rounded text-sm"
                                          title="Reset to original"
                                        >
                                          ↺
                                        </button>
                                      </div>
                                      <textarea
                                        value={variantChanges().instructions?.[index()]?.instruction || ""}
                                        onInput={(e) => updateVariantInstruction(index(), "instruction", e.currentTarget.value)}
                                        placeholder="Override instruction"
                                        class="w-full px-3 py-2 text-sm border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none bg-emerald-50"
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
                  <Show when={formData().imageUrl && !isEditing()}>
                    <img
                      src={formData().imageUrl}
                      alt={formData().title}
                      class="w-full rounded-lg shadow-md"
                    />
                  </Show>

                  <Show when={isEditing()}>
                    <div class="bg-gray-50 rounded-lg p-4">
                      <label class="block text-sm font-medium text-gray-700 mb-2">
                        Image URL
                      </label>
                      <input
                        type="url"
                        value={formData().imageUrl || ""}
                        onInput={(e) => setFormData({ ...formData(), imageUrl: e.currentTarget.value })}
                        placeholder="https://example.com/image.jpg"
                        class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </Show>

                  <div class="bg-gray-50 rounded-lg p-4 space-y-4">
                    <h3 class="font-semibold text-gray-900">Recipe Details</h3>
                    
                    <Show
                      when={isEditing()}
                      fallback={
                        <div class="space-y-2 text-sm">
                           <Show when={formData().servings}>
                             <div class="flex justify-between">
                               <span class="text-gray-600">Servings:</span>
                               <span class="font-medium">
                                 {Math.round((formData().servings || 0) * recipeMultiplier())}
                                 <Show when={recipeMultiplier() !== 1}>
                                   <span class="text-xs text-gray-500 ml-1">
                                     (originally {formData().servings})
                                   </span>
                                 </Show>
                               </span>
                             </div>
                           </Show>
                          <Show when={formData().prepTime}>
                            <div class="flex justify-between">
                              <span class="text-gray-600">Prep Time:</span>
                              <span class="font-medium">{formatTime(formData().prepTime)}</span>
                            </div>
                          </Show>
                          <Show when={formData().cookTime}>
                            <div class="flex justify-between">
                              <span class="text-gray-600">Cook Time:</span>
                              <span class="font-medium">{formatTime(formData().cookTime)}</span>
                            </div>
                          </Show>
                          <Show when={formData().difficulty}>
                            <div class="flex justify-between">
                              <span class="text-gray-600">Difficulty:</span>
                              <span class="font-medium">{formData().difficulty}</span>
                            </div>
                          </Show>
                          <Show when={formData().cuisine}>
                            <div class="flex justify-between">
                              <span class="text-gray-600">Cuisine:</span>
                              <span class="font-medium">{formData().cuisine}</span>
                            </div>
                          </Show>
                        </div>
                      }
                    >
                      <div class="grid grid-cols-2 gap-3">
                        <div>
                          <label class="block text-xs font-medium text-gray-700 mb-1">
                            Servings
                          </label>
                          <Show 
                            when={editingVariantId()}
                            fallback={
                              <input
                                type="number"
                                value={formData().servings || ""}
                                onInput={(e) => setFormData({ ...formData(), servings: parseInt(e.currentTarget.value) || undefined })}
                                class="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            }
                          >
                            <div class="space-y-2">
                              <div class="px-2 py-2 text-sm bg-gray-100 rounded border">
                                <span class="text-gray-600">Original: </span>
                                <span class="font-medium">{recipe()?.servings || "Not set"}</span>
                              </div>
                              <input
                                type="number"
                                value={variantChanges().servings || ""}
                                onInput={(e) => setVariantChanges({ ...variantChanges(), servings: parseInt(e.currentTarget.value) || undefined })}
                                placeholder="Override with variant value"
                                class="w-full px-2 py-2 text-sm border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50"
                              />
                            </div>
                          </Show>
                        </div>
                        
                        <div>
                          <label class="block text-xs font-medium text-gray-700 mb-1">
                            Prep (min)
                          </label>
                          <input
                            type="number"
                            value={formData().prepTime || ""}
                            onInput={(e) => setFormData({ ...formData(), prepTime: parseInt(e.currentTarget.value) || undefined })}
                            class="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        
                        <div>
                          <label class="block text-xs font-medium text-gray-700 mb-1">
                            Cook (min)
                          </label>
                          <input
                            type="number"
                            value={formData().cookTime || ""}
                            onInput={(e) => setFormData({ ...formData(), cookTime: parseInt(e.currentTarget.value) || undefined })}
                            class="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        
                        <div>
                          <label class="block text-xs font-medium text-gray-700 mb-1">
                            Difficulty
                          </label>
                          <select
                            value={formData().difficulty || ""}
                            onChange={(e) => setFormData({ ...formData(), difficulty: e.currentTarget.value || undefined })}
                            class="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">Select</option>
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                          </select>
                        </div>
                        
                        <div class="col-span-2">
                          <label class="block text-xs font-medium text-gray-700 mb-1">
                            Cuisine
                          </label>
                          <input
                            type="text"
                            value={formData().cuisine || ""}
                            onInput={(e) => setFormData({ ...formData(), cuisine: e.currentTarget.value || undefined })}
                            placeholder="e.g., Italian, Mexican, Asian"
                            class="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </Show>
                  </div>

                  <div class="bg-gray-50 rounded-lg p-4">
                    <h3 class="font-semibold text-gray-900 mb-3">Tags</h3>
                    
                    <Show when={isEditing()}>
                      <div class="mb-3">
                        <div class="flex gap-2">
                          <input
                            type="text"
                            value={newTagName()}
                            onInput={(e) => setNewTagName(e.currentTarget.value)}
                            placeholder="Create new tag"
                            class="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                          when={formData().tags && formData().tags.length > 0}
                          fallback={<p class="text-sm text-gray-500 italic">No tags assigned</p>}
                        >
                          <div class="flex flex-wrap gap-2">
                            <For each={formData().tags?.filter(tag => tag && tag.id && tag.name) || []}>
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
                        fallback={<p class="text-sm text-gray-500">Loading tags...</p>}
                      >
                        <div class="flex flex-wrap gap-2">
                          <For each={tags()?.filter(tag => tag && tag.id && tag.name) || []}>
                            {(tag) => {
                              const isSelected = () => formData().tags?.some(t => t && t.id === tag.id) || false;
                              return (
                                <button
                                  onClick={() => toggleTag(tag)}
                                  class={`px-2 py-1 rounded-full text-xs transition-colors ${
                                    isSelected()
                                      ? "text-white"
                                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
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

                  <Show when={formData().sourceUrl && !isEditing()}>
                    <div class="bg-gray-50 rounded-lg p-4">
                      <h3 class="font-semibold text-gray-900 mb-2">Source</h3>
                      <a
                        href={formData().sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-emerald-600 hover:text-emerald-700 text-sm break-all"
                      >
                        View Original Recipe ↗
                      </a>
                    </div>
                  </Show>

                  <Show when={isEditing()}>
                    <div class="bg-gray-50 rounded-lg p-4">
                      <label class="block text-sm font-medium text-gray-700 mb-2">
                        Source URL
                      </label>
                      <input
                        type="url"
                        value={formData().sourceUrl || ""}
                        onInput={(e) => setFormData({ ...formData(), sourceUrl: e.currentTarget.value || undefined })}
                        placeholder="https://example.com/recipe"
                        class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
            <div class="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-4">Create New Variant</h2>
              
              <div class="space-y-4">
                <input
                  type="text"
                  placeholder="Variant name (e.g., Vegan Version)"
                  value={newVariantName()}
                  onInput={(e) => setNewVariantName(e.currentTarget.value)}
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
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
            <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-4">Fork Recipe</h2>
              <p class="text-gray-600 mb-4">
                This will create a copy of this recipe in your personal collection that you can edit independently.
              </p>
              
              <div class="space-y-4">
                <div>
                  <label for="forkTitle" class="block text-sm font-medium text-gray-700 mb-2">
                    Recipe Title
                  </label>
                  <input
                    id="forkTitle"
                    type="text"
                    placeholder="Enter title for your copy"
                    value={forkTitle()}
                    onInput={(e) => setForkTitle(e.currentTarget.value)}
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
         </Show>
    </PageLayout>
  );
}