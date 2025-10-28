import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { GroceryListService } from '~/lib/grocery-list-service';
import { getRecipeById, getRecipeVariant } from '~/lib/recipe-service';

export async function GET(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const groceryListId = event.params?.id;
    
    if (!groceryListId) {
      return new Response(JSON.stringify({ error: 'Grocery list ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get real recipes from database
    const recipes = await GroceryListService.getGroceryListRecipes(groceryListId);

    return new Response(JSON.stringify({ recipes }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get grocery list recipes error:', error);
    
    if (error instanceof Error && error.message.includes('Authentication')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const groceryListId = event.params?.id;
    
    if (!groceryListId) {
      return new Response(JSON.stringify({ error: 'Grocery list ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await event.request.json();
    const { recipeId, variantId, multiplier = 1, dryRun = false } = body;

    if (!recipeId) {
      return new Response(JSON.stringify({ error: 'Recipe ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify recipe exists and user has access
    const recipe = await getRecipeById(recipeId, user.id);
    if (!recipe) {
      return new Response(JSON.stringify({ error: 'Recipe not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add recipe to grocery list
    const groceryListRecipe = await GroceryListService.addRecipeToGroceryList(
      groceryListId,
      recipeId,
      variantId,
      multiplier
    );

    // Get ingredients from the recipe (or variant if specified)
    let ingredients = recipe.ingredients || [];
    
    if (variantId) {
      const variant = await getRecipeVariant(variantId, user.id);
      if (variant && variant.ingredients) {
        // Merge variant ingredients with base recipe ingredients
        ingredients = recipe.ingredients.map((baseIngredient, index) => {
          const variantIngredient = variant.ingredients?.[index];
          if (variantIngredient && variantIngredient.ingredient && variantIngredient.ingredient.trim()) {
            return variantIngredient;
          }
          return baseIngredient;
        });
      }
    }

    // Process ingredients and find matches with existing items
    const ingredientMatches = await GroceryListService.processRecipeIngredients(
      groceryListId,
      ingredients,
      multiplier
    );

    // Categorize matches 
    const exactMatches = ingredientMatches.filter(match => 
      match.existingItem && match.confidence >= 1.0
    );
    const potentialMatches = ingredientMatches.filter(match => 
      match.existingItem && match.confidence >= 0.6 && match.confidence < 1.0
    );
    const noMatches = ingredientMatches.filter(match => 
      !match.existingItem || match.confidence < 0.6
    );

    // If this is a dry run or there are partial matches, return analysis without processing
    if (dryRun || potentialMatches.length > 0) {
      return new Response(JSON.stringify({
        groceryListRecipe,
        matches: potentialMatches,
        pendingExactMatches: exactMatches,
        pendingNewItems: noMatches,
        dryRun: dryRun,
        message: dryRun 
          ? `Recipe analyzed: ${potentialMatches.length} potential matches, ${exactMatches.length} exact matches, ${noMatches.length} new items`
          : `Recipe added! Please review ${potentialMatches.length} potential matches. ${exactMatches.length} exact matches and ${noMatches.length} new items will be processed automatically after your review.`
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // No partial matches - process exact matches and new items immediately
    // Auto-merge exact matches (100% confidence)
    for (const match of exactMatches) {
      const combined = GroceryListService.combineQuantities(
        match.existingItem!.quantity,
        match.ingredient.quantity?.toString(),
        match.existingItem!.unit,
        match.ingredient.unit
      );

      await GroceryListService.updateGroceryListItem(match.existingItem!.id, {
        quantity: combined.quantity,
        unit: combined.unit,
        notes: match.existingItem!.notes && match.ingredient.notes
          ? `${match.existingItem!.notes}; ${match.ingredient.notes}`
          : match.existingItem!.notes || match.ingredient.notes,
      });
    }

    // Add items with no matches as new items
    for (const match of noMatches) {
      await GroceryListService.addGroceryListItem(groceryListId, {
        name: match.ingredient.ingredient,
        quantity: match.ingredient.quantity?.toString(),
        unit: match.ingredient.unit,
        notes: match.ingredient.notes,
        isCompleted: false,
        order: 0,
      });
    }

    return new Response(JSON.stringify({ 
      groceryListRecipe,
      ingredientsProcessed: ingredientMatches.length,
      autoMerged: exactMatches.length,
      autoAdded: noMatches.length,
      message: `Recipe added! ${exactMatches.length} exact matches auto-merged, ${noMatches.length} new items added.`
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Add recipe to grocery list error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (error instanceof Error && error.message.includes('Authentication')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}