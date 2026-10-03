import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { db as database } from '../db/index';
import { recipes, recipeVariants, groceryLists, groceryListItems, groceryListRecipes } from '../db/schema.ts';
import { parseFractionForShopping } from './fraction-utils.ts';
import { isLegacyRecipeData, migrateIngredientsFromString } from './migration-helpers.ts';

export class RecipeGroceryListError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function createRecipeGroceryList(
  db: typeof database,
  userId: string,
  recipeId: string,
  options: { variantId?: string; multiplier?: number } = {},
) {
  const { variantId, multiplier = 1 } = options;
  if (typeof multiplier !== 'number' || !Number.isFinite(multiplier) || multiplier <= 0) {
    throw new RecipeGroceryListError('Recipe multiplier must be a positive number.', 400);
  }
  if (variantId !== undefined && (typeof variantId !== 'string' || !variantId.trim())) {
    throw new RecipeGroceryListError('Invalid recipe variant.', 400);
  }

  // Reads and writes share a transaction: failures cannot leave an empty list.
  return db.transaction(async tx => {
    const [recipe] = await tx.select().from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)));
    if (!recipe) throw new RecipeGroceryListError('Recipe not found.', 404);

    let ingredients = isLegacyRecipeData(recipe)
      ? migrateIngredientsFromString(recipe.ingredients as unknown as string[])
      : recipe.ingredients;
    let variantName: string | undefined;
    if (variantId) {
      const [variant] = await tx.select().from(recipeVariants)
        .where(and(eq(recipeVariants.id, variantId), eq(recipeVariants.recipeId, recipeId)));
      if (!variant) throw new RecipeGroceryListError('Recipe variant not found.', 404);
      variantName = variant.name;
      // Match the recipe view's sparse, per-ingredient variant overrides.
      ingredients = ingredients.map((ingredient, index) => {
        const override = variant.ingredients?.[index];
        return override?.ingredient?.trim() ? override : ingredient;
      });
    }
    ingredients = ingredients.filter(ingredient => ingredient.ingredient.trim());
    if (!ingredients.length) {
      throw new RecipeGroceryListError('Add ingredients to this recipe before creating a grocery list.', 400);
    }

    const now = new Date();
    const list = {
      id: randomUUID(), userId,
      name: variantName ? `${recipe.title} — ${variantName}` : recipe.title,
      createdAt: now, updatedAt: now,
    };
    await tx.insert(groceryLists).values(list);
    await tx.insert(groceryListRecipes).values({
      id: randomUUID(), groceryListId: list.id, recipeId, variantId,
      multiplier, addedAt: now,
    });
    // Keep recipe order, units, and notes, including ingredients without units.
    const items = ingredients.map((ingredient, order) => {
      const amount = ingredient.quantity ? parseFractionForShopping(ingredient.quantity) : 0;
      return {
        id: randomUUID(), groceryListId: list.id,
        name: ingredient.ingredient.trim(),
        quantity: amount > 0 ? String(amount * multiplier) : ingredient.quantity,
        unit: ingredient.unit, notes: ingredient.notes,
        isCompleted: false, order, createdAt: now,
      };
    });
    // Stay under SQLite's bind-parameter limit for long recipes.
    for (let index = 0; index < items.length; index += 50) {
      await tx.insert(groceryListItems).values(items.slice(index, index + 50));
    }
    return list;
  });
}
