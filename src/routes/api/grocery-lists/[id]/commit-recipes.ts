import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { GroceryListService } from '~/lib/grocery-list-service';
import { getRecipeById, getRecipeVariant } from '~/lib/recipe-service';

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
    const { recipes, partialMatchDecisions, exactMatches, newItems } = body;

    if (!recipes || !Array.isArray(recipes)) {
      return new Response(JSON.stringify({ error: 'Recipes array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // First, add all recipes to the grocery list
    const addedRecipes = [];
    for (const { recipeId, variantId, multiplier = 1 } of recipes) {
      const groceryListRecipe = await GroceryListService.addRecipeToGroceryList(
        groceryListId,
        recipeId,
        variantId,
        multiplier
      );
      addedRecipes.push(groceryListRecipe);
    }

    // Process partial match decisions
    if (partialMatchDecisions && Array.isArray(partialMatchDecisions)) {
      for (const decision of partialMatchDecisions) {
        const { ingredient, action, existingItem, recipes, matchType } = decision;
        
        if (action === 'merge' && existingItem) {
          // User chose to merge with existing item - combine quantities
          const combined = GroceryListService.combineQuantities(
            existingItem.quantity,
            ingredient.quantity?.toString(),
            existingItem.unit,
            ingredient.unit
          );

          await GroceryListService.updateGroceryListItem(existingItem.id, {
            quantity: combined.quantity,
            unit: combined.unit,
            notes: existingItem.notes && ingredient.notes
              ? `${existingItem.notes}; ${ingredient.notes}`
              : existingItem.notes || ingredient.notes,
          });
        } else if (action === 'merge' && !existingItem) {
          // Recipe-to-recipe match - user chose to merge similar ingredients from multiple recipes
          // Aggregate quantities from all matching recipes
          const { recipes } = decision;
          
          if (recipes && recipes.length > 1) {
            console.log('🔢 AGGREGATING QUANTITIES for recipe-to-recipe match:', {
              ingredient: ingredient.ingredient,
              recipesCount: recipes.length,
              recipeData: recipes.map(r => ({
                title: r.title,
                ingredient: r.ingredient,
                quantity: r.quantity,
                unit: r.unit
              }))
            });
            
            // Combine quantities from all recipes
            let combinedQuantity = '';
            let combinedUnit = '';
            let combinedNotes = '';
            
            for (let i = 0; i < recipes.length; i++) {
              const recipe = recipes[i];
              console.log(`📊 Processing recipe ${i + 1}/${recipes.length}:`, {
                quantity: recipe.quantity,
                unit: recipe.unit,
                currentCombined: { quantity: combinedQuantity, unit: combinedUnit }
              });
              
              if (i === 0) {
                // First recipe - use as base
                combinedQuantity = recipe.quantity?.toString() || '';
                combinedUnit = recipe.unit || '';
                combinedNotes = recipe.notes || '';
              } else {
                // Subsequent recipes - combine with running total
                const combined = GroceryListService.combineQuantities(
                  combinedQuantity,
                  recipe.quantity?.toString(),
                  combinedUnit,
                  recipe.unit
                );
                console.log(`🔗 Combined result:`, combined);
                combinedQuantity = combined.quantity;
                combinedUnit = combined.unit || combinedUnit;
                
                // Combine notes
                if (recipe.notes && combinedNotes !== recipe.notes) {
                  combinedNotes = combinedNotes 
                    ? `${combinedNotes}; ${recipe.notes}`
                    : recipe.notes;
                }
              }
            }
            
            console.log('✅ FINAL AGGREGATED RESULT:', {
              name: ingredient.ingredient,
              quantity: combinedQuantity,
              unit: combinedUnit,
              notes: combinedNotes
            });
            
            // Add the consolidated item with combined quantities
            await GroceryListService.addGroceryListItem(groceryListId, {
              name: ingredient.ingredient,
              quantity: combinedQuantity,
              unit: combinedUnit,
              notes: combinedNotes,
              isCompleted: false,
              order: 0,
            });
          } else {
            // Fallback to single ingredient if recipes data is missing
            await GroceryListService.addGroceryListItem(groceryListId, {
              name: ingredient.ingredient,
              quantity: ingredient.quantity?.toString(),
              unit: ingredient.unit,
              notes: ingredient.notes,
              isCompleted: false,
              order: 0,
            });
          }
        } else if (action === 'separate') {
          // User chose to keep separate
          if (matchType === 'recipe-to-recipe' && recipes && recipes.length > 1) {
            // Recipe-to-recipe match - add separate items for each recipe
            for (const recipe of recipes) {
              await GroceryListService.addGroceryListItem(groceryListId, {
                name: recipe.ingredient,
                quantity: recipe.quantity?.toString(),
                unit: recipe.unit,
                notes: recipe.notes,
                isCompleted: false,
                order: 0,
              });
            }
          } else {
            // Regular match with existing item - add as new item
            await GroceryListService.addGroceryListItem(groceryListId, {
              name: ingredient.ingredient,
              quantity: ingredient.quantity?.toString(),
              unit: ingredient.unit,
              notes: ingredient.notes,
              isCompleted: false,
              order: 0,
            });
          }
        }
        // If action === 'skip', do nothing
      }
    }

    // Auto-process exact matches
    if (exactMatches && Array.isArray(exactMatches)) {
      for (const match of exactMatches) {
        const combined = GroceryListService.combineQuantities(
          match.existingItem.quantity,
          match.ingredient.quantity?.toString(),
          match.existingItem.unit,
          match.ingredient.unit
        );

        await GroceryListService.updateGroceryListItem(match.existingItem.id, {
          quantity: combined.quantity,
          unit: combined.unit,
          notes: match.existingItem.notes && match.ingredient.notes
            ? `${match.existingItem.notes}; ${match.ingredient.notes}`
            : match.existingItem.notes || match.ingredient.notes,
        });
      }
    }

    // Auto-add new items
    if (newItems && Array.isArray(newItems)) {
      for (const match of newItems) {
        await GroceryListService.addGroceryListItem(groceryListId, {
          name: match.ingredient.ingredient,
          quantity: match.ingredient.quantity?.toString(),
          unit: match.ingredient.unit,
          notes: match.ingredient.notes,
          isCompleted: false,
          order: 0,
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      recipesAdded: addedRecipes.length,
      ingredientsProcessed: (partialMatchDecisions?.length || 0) + (exactMatches?.length || 0) + (newItems?.length || 0)
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Commit recipes error:', error);
    
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