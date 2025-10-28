import { db } from '~/db';
import { recipes, tags, recipeTags, recipeVariants } from '~/db/schema';
import { eq, and, like, or, desc, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { migrateIngredientsFromString, migrateInstructionsFromString, isLegacyRecipeData } from './migration-helpers';

export interface RecipeIngredient {
  quantity?: string;
  unit?: string;
  ingredient: string;
  notes?: string;
}

export interface RecipeInstruction {
  step: number;
  instruction: string;
  time?: number;
  temperature?: string;
}

export interface CreateRecipeData {
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
  tagIds?: string[];
}

export interface UpdateRecipeData extends Partial<CreateRecipeData> {}

export interface RecipeWithTags {
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

export interface RecipeVariant {
  id: string;
  recipeId: string;
  name: string;
  description?: string;
  // Only fields that differ from the original recipe
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

export interface RecipeWithVariants extends RecipeWithTags {
  variants: RecipeVariant[];
}

export interface SearchFilters {
  query?: string;
  tagIds?: string[];
  cuisine?: string;
  difficulty?: string;
  maxCookTime?: number;
  sortBy?: 'createdAt' | 'title' | 'cookTime';
  sortOrder?: 'asc' | 'desc';
}

export async function createRecipe(userId: string, data: CreateRecipeData): Promise<string> {
  const recipeId = uuidv4();
  
  await db.transaction(async (tx) => {
    await tx.insert(recipes).values({
      id: recipeId,
      userId,
      ...data,
    });

    if (data.tagIds && data.tagIds.length > 0) {
      const recipeTagData = data.tagIds.map(tagId => ({
        recipeId,
        tagId,
      }));
      await tx.insert(recipeTags).values(recipeTagData);
    }
  });

  return recipeId;
}

export async function getRecipeById(recipeId: string, userId: string): Promise<RecipeWithTags | null> {
  const recipe = await db.select({
    recipe: recipes,
    tag: {
      id: tags.id,
      name: tags.name,
      color: tags.color,
    },
  })
  .from(recipes)
  .leftJoin(recipeTags, eq(recipes.id, recipeTags.recipeId))
  .leftJoin(tags, eq(recipeTags.tagId, tags.id))
  .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
  .execute();

  if (recipe.length === 0) {
    return null;
  }

  const firstRecipe = recipe[0].recipe;
  const associatedTags = recipe
    .filter(r => r.tag && r.tag.id)
    .map(r => r.tag)
    .filter((tag, index, self) => self.findIndex(t => t.id === tag.id) === index);

  let processedRecipe = { ...firstRecipe };
  
  // Handle legacy data migration
  if (isLegacyRecipeData(processedRecipe)) {
    processedRecipe.ingredients = migrateIngredientsFromString(processedRecipe.ingredients as any);
    processedRecipe.instructions = migrateInstructionsFromString(processedRecipe.instructions as any);
  }

  return {
    ...processedRecipe,
    tags: associatedTags as Array<{ id: string; name: string; color: string; }>,
  } as RecipeWithTags;
}

export async function getUserRecipes(userId: string, filters: SearchFilters = {}): Promise<RecipeWithTags[]> {
  let query = db.select({
    recipe: recipes,
    tag: {
      id: tags.id,
      name: tags.name,
      color: tags.color,
    },
  })
  .from(recipes)
  .leftJoin(recipeTags, eq(recipes.id, recipeTags.recipeId))
  .leftJoin(tags, eq(recipeTags.tagId, tags.id))
  .where(eq(recipes.userId, userId));

  if (filters.query) {
    query = query.where(and(
      eq(recipes.userId, userId),
      or(
        like(recipes.title, `%${filters.query}%`),
        like(recipes.description, `%${filters.query}%`)
      )
    ));
  }

  if (filters.cuisine) {
    query = query.where(and(
      eq(recipes.userId, userId),
      eq(recipes.cuisine, filters.cuisine)
    ));
  }

  if (filters.difficulty) {
    query = query.where(and(
      eq(recipes.userId, userId),
      eq(recipes.difficulty, filters.difficulty)
    ));
  }

  const sortField = filters.sortBy || 'createdAt';
  const sortDirection = filters.sortOrder === 'asc' ? asc : desc;
  
  query = query.orderBy(sortDirection(recipes[sortField]));

  const results = await query.execute();

  const recipeMap = new Map<string, RecipeWithTags>();

  results.forEach(result => {
    const recipeId = result.recipe.id;
    
    if (!recipeMap.has(recipeId)) {
      let processedRecipe = { ...result.recipe };
      
      // Handle legacy data migration
      if (isLegacyRecipeData(processedRecipe)) {
        processedRecipe.ingredients = migrateIngredientsFromString(processedRecipe.ingredients as any);
        processedRecipe.instructions = migrateInstructionsFromString(processedRecipe.instructions as any);
      }
      
      recipeMap.set(recipeId, {
        ...processedRecipe,
        tags: [],
      } as RecipeWithTags);
    }

    if (result.tag && result.tag.id) {
      const recipe = recipeMap.get(recipeId)!;
      const tagExists = recipe.tags.some(tag => tag.id === result.tag.id);
      if (!tagExists) {
        recipe.tags.push(result.tag as { id: string; name: string; color: string; });
      }
    }
  });

  let recipesArray = Array.from(recipeMap.values());

  if (filters.tagIds && filters.tagIds.length > 0) {
    recipesArray = recipesArray.filter(recipe => 
      filters.tagIds!.some(tagId => recipe.tags.some(tag => tag.id === tagId))
    );
  }

  if (filters.maxCookTime) {
    recipesArray = recipesArray.filter(recipe => 
      !recipe.cookTime || recipe.cookTime <= filters.maxCookTime!
    );
  }

  return recipesArray;
}

export async function updateRecipe(recipeId: string, userId: string, data: UpdateRecipeData): Promise<boolean> {
  const result = await db.transaction(async (tx) => {
    const updateData = { ...data };
    delete (updateData as any).tagIds;
    updateData.updatedAt = new Date();

    const [updatedRecipe] = await tx.update(recipes)
      .set(updateData)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
      .returning({ id: recipes.id });

    if (!updatedRecipe) {
      return false;
    }

    if (data.tagIds !== undefined) {
      await tx.delete(recipeTags).where(eq(recipeTags.recipeId, recipeId));
      
      if (data.tagIds.length > 0) {
        const recipeTagData = data.tagIds.map(tagId => ({
          recipeId,
          tagId,
        }));
        await tx.insert(recipeTags).values(recipeTagData);
      }
    }

    return true;
  });

  return result;
}

export async function deleteRecipe(recipeId: string, userId: string): Promise<boolean> {
  const [deletedRecipe] = await db.delete(recipes)
    .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
    .returning({ id: recipes.id });

  return !!deletedRecipe;
}

export async function createTag(name: string, color: string = '#64748b'): Promise<string> {
  const tagId = uuidv4();
  
  await db.insert(tags).values({
    id: tagId,
    name,
    color,
  });

  return tagId;
}

export async function getAllTags(): Promise<Array<{ id: string; name: string; color: string; }>> {
  return await db.select({
    id: tags.id,
    name: tags.name,
    color: tags.color,
  }).from(tags).orderBy(asc(tags.name));
}

export async function deleteTag(tagId: string): Promise<boolean> {
  const [deletedTag] = await db.delete(tags)
    .where(eq(tags.id, tagId))
    .returning({ id: tags.id });

  return !!deletedTag;
}

// Recipe Variant Functions
export async function createRecipeVariant(
  recipeId: string, 
  userId: string, 
  variantData: Omit<RecipeVariant, 'id' | 'recipeId' | 'createdAt' | 'updatedAt'>
): Promise<string | null> {
  // First verify the recipe belongs to the user
  const recipe = await getRecipeById(recipeId, userId);
  if (!recipe) return null;

  const variantId = uuidv4();
  
  await db.insert(recipeVariants).values({
    id: variantId,
    recipeId,
    ...variantData,
  });

  return variantId;
}

export async function getRecipeVariants(recipeId: string, userId: string): Promise<RecipeVariant[]> {
  // First verify the recipe belongs to the user
  const recipe = await getRecipeById(recipeId, userId);
  if (!recipe) return [];

  const variants = await db.select().from(recipeVariants)
    .where(eq(recipeVariants.recipeId, recipeId))
    .orderBy(asc(recipeVariants.createdAt));

  return variants;
}

export async function getRecipeVariant(variantId: string, userId: string): Promise<RecipeVariant | null> {
  const [variant] = await db.select().from(recipeVariants)
    .innerJoin(recipes, eq(recipeVariants.recipeId, recipes.id))
    .where(and(
      eq(recipeVariants.id, variantId),
      eq(recipes.userId, userId)
    ));

  return variant?.recipe_variants || null;
}

export async function getRecipeWithVariants(recipeId: string, userId: string): Promise<RecipeWithVariants | null> {
  const recipe = await getRecipeById(recipeId, userId);
  if (!recipe) return null;

  const variants = await getRecipeVariants(recipeId, userId);

  return {
    ...recipe,
    variants,
  };
}

export async function updateRecipeVariant(
  variantId: string, 
  recipeId: string, 
  userId: string, 
  variantData: Partial<RecipeVariant>
): Promise<boolean> {
  // First verify the recipe belongs to the user
  const recipe = await getRecipeById(recipeId, userId);
  if (!recipe) return false;

  const updateData = { ...variantData };
  delete (updateData as any).id;
  delete (updateData as any).recipeId;
  delete (updateData as any).createdAt;
  updateData.updatedAt = new Date();

  const [updatedVariant] = await db.update(recipeVariants)
    .set(updateData)
    .where(and(eq(recipeVariants.id, variantId), eq(recipeVariants.recipeId, recipeId)))
    .returning({ id: recipeVariants.id });

  return !!updatedVariant;
}

export async function deleteRecipeVariant(variantId: string, recipeId: string, userId: string): Promise<boolean> {
  // First verify the recipe belongs to the user
  const recipe = await getRecipeById(recipeId, userId);
  if (!recipe) return false;

  const [deletedVariant] = await db.delete(recipeVariants)
    .where(and(eq(recipeVariants.id, variantId), eq(recipeVariants.recipeId, recipeId)))
    .returning({ id: recipeVariants.id });

  return !!deletedVariant;
}

// Helper function to merge a variant with the base recipe
export function mergeVariantWithRecipe(baseRecipe: RecipeWithTags, variant: RecipeVariant): RecipeWithTags {
  return {
    ...baseRecipe,
    // Override with variant values where they exist
    ...(variant.ingredients !== undefined && { ingredients: variant.ingredients }),
    ...(variant.instructions !== undefined && { instructions: variant.instructions }),
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

// Recipe Forking Function
export async function forkRecipe(
  sourceRecipeId: string, 
  targetUserId: string, 
  newTitle?: string,
  sourceUserId?: string
): Promise<string | null> {
  // Get the source recipe - if sourceUserId is provided, check that user's access
  // Otherwise, assume the targetUserId has access (e.g., through cookbook)
  const sourceRecipe = sourceUserId 
    ? await getRecipeById(sourceRecipeId, sourceUserId)
    : await db.select().from(recipes).where(eq(recipes.id, sourceRecipeId)).then(r => r[0]);

  if (!sourceRecipe) return null;

  // Create recipe data for the fork
  const forkData: CreateRecipeData = {
    title: newTitle || `${sourceRecipe.title} (Copy)`,
    description: sourceRecipe.description,
    ingredients: Array.isArray(sourceRecipe.ingredients) ? sourceRecipe.ingredients : [],
    instructions: Array.isArray(sourceRecipe.instructions) ? sourceRecipe.instructions : [],
    servings: sourceRecipe.servings,
    yield: sourceRecipe.yield,
    cookTime: sourceRecipe.cookTime,
    prepTime: sourceRecipe.prepTime,
    totalTime: sourceRecipe.totalTime,
    restTime: sourceRecipe.restTime,
    difficulty: sourceRecipe.difficulty,
    cuisine: sourceRecipe.cuisine,
    category: sourceRecipe.category,
    diet: sourceRecipe.diet,
    imageUrl: sourceRecipe.imageUrl,
    sourceUrl: sourceRecipe.sourceUrl,
    sourceAuthor: sourceRecipe.sourceAuthor,
    equipment: sourceRecipe.equipment,
    notes: sourceRecipe.notes,
    nutrition: sourceRecipe.nutrition,
    // Don't copy tags by default - user can add their own
  };

  // Handle legacy data
  if (isLegacyRecipeData(sourceRecipe)) {
    forkData.ingredients = migrateIngredientsFromString(sourceRecipe.ingredients as any);
    forkData.instructions = migrateInstructionsFromString(sourceRecipe.instructions as any);
  }

  return await createRecipe(targetUserId, forkData);
}

export async function canUserEditRecipe(recipeId: string, userId: string): Promise<boolean> {
  const recipe = await db.select({ userId: recipes.userId })
    .from(recipes)
    .where(eq(recipes.id, recipeId))
    .limit(1);

  return recipe.length > 0 && recipe[0].userId === userId;
}