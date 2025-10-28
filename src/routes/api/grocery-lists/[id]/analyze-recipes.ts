import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { GroceryListService } from '~/lib/grocery-list-service';
import { getRecipeById, getRecipeVariant } from '~/lib/recipe-service';
import { parseFraction } from '~/lib/fraction-utils';

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
    const { recipes } = body; // Array of { recipeId, variantId, multiplier }

    if (!recipes || !Array.isArray(recipes)) {
      return new Response(JSON.stringify({ error: 'Recipes array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Step 1: Collect all ingredients from all recipes
    const allRecipeIngredients = [];
    
    for (const { recipeId, variantId, multiplier = 1 } of recipes) {
      // Verify recipe exists and user has access
      const recipe = await getRecipeById(recipeId, user.id);
      if (!recipe) {
        continue; // Skip invalid recipes
      }

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

      // Parse and store ingredients with recipe metadata
      for (const ingredient of ingredients) {
        if (!ingredient.ingredient || !ingredient.ingredient.trim()) {
          continue;
        }
        
        // Parse ingredient using the same logic as processRecipeIngredients
        const parsed = GroceryListService.parseIngredient(ingredient.ingredient);
        
        // Apply multiplier to quantity
        if (parsed.quantity && multiplier !== 1) {
          parsed.quantity = parsed.quantity * multiplier;
        }
        
        // Use structured data from recipe if available
        let parsedIngredient;
        if (ingredient.quantity && ingredient.unit) {
          const adjustedQuantity = ingredient.quantity && multiplier !== 1 
            ? (parseFraction(ingredient.quantity) * multiplier).toString()
            : ingredient.quantity;
          
          parsedIngredient = {
            originalText: `${adjustedQuantity} ${ingredient.unit} ${ingredient.ingredient}`,
            quantity: adjustedQuantity ? parseFraction(adjustedQuantity) : undefined,
            unit: ingredient.unit,
            ingredient: ingredient.ingredient,
            notes: ingredient.notes,
          };
        } else {
          parsedIngredient = parsed;
        }
        allRecipeIngredients.push({
          ...parsedIngredient,
          recipeId,
          variantId,
          multiplier,
          recipeTitle: recipe.title,
          sourceRecipeIndex: allRecipeIngredients.filter(i => i.recipeId === recipeId).length
        });
      }
    }

    // Step 2: Two-phase matching process
    const allMatches = [];
    const allExactMatches = [];
    const allNewItems = [];
    const processedIngredients = new Set();

    // Phase 1: Find matches between recipe ingredients (recipe-to-recipe matching)
    for (let i = 0; i < allRecipeIngredients.length; i++) {
      const currentIngredient = allRecipeIngredients[i];
      
      if (processedIngredients.has(i)) {
        continue; // Already processed as part of a match
      }

      const recipeMatches = [];
      recipeMatches.push(currentIngredient); // Include the current ingredient
      
      // Look for similar ingredients in other recipes
      for (let j = i + 1; j < allRecipeIngredients.length; j++) {
        const otherIngredient = allRecipeIngredients[j];
        
        if (processedIngredients.has(j) || currentIngredient.recipeId === otherIngredient.recipeId) {
          continue; // Skip if already processed or same recipe
        }

        const similarity = GroceryListService.calculateIngredientSimilarity(
          currentIngredient.ingredient.toLowerCase(),
          otherIngredient.ingredient.toLowerCase()
        );

        if (similarity >= 0.6) {
          recipeMatches.push(otherIngredient);
          processedIngredients.add(j);
        }
      }

      // Mark current ingredient as processed
      processedIngredients.add(i);

      // If we found recipe-to-recipe matches, create a consolidated match group
      if (recipeMatches.length > 1) {
        // This is a recipe-to-recipe partial match that needs user confirmation
        const consolidatedMatch = {
          ingredient: currentIngredient, // Use first ingredient as primary
          confidence: 0.8, // Recipe-to-recipe matches get medium confidence
          existingItem: null, // No existing item, this is a recipe conflict
          recipes: recipeMatches.map(rm => ({ // Format for frontend compatibility
            id: rm.recipeId,
            title: rm.recipeTitle,
            ingredient: rm.ingredient,
            quantity: rm.quantity,
            unit: rm.unit
          })),
          matchType: 'recipe-to-recipe',
          recipeId: currentIngredient.recipeId,
          variantId: currentIngredient.variantId,
          multiplier: currentIngredient.multiplier,
          recipeTitle: currentIngredient.recipeTitle
        };
        
        allMatches.push(consolidatedMatch);
      } else {
        // Phase 2: Single ingredient - check against existing grocery list items
        const ingredientMatches = await GroceryListService.processRecipeIngredients(
          groceryListId,
          [{ 
            quantity: currentIngredient.originalText.split(' ')[0],
            unit: currentIngredient.unit,
            ingredient: currentIngredient.ingredient,
            notes: currentIngredient.notes
          }],
          currentIngredient.multiplier
        );

        if (ingredientMatches.length > 0) {
          const match = ingredientMatches[0];
          
          // Add recipe metadata
          const enhancedMatch = {
            ...match,
            recipeId: currentIngredient.recipeId,
            variantId: currentIngredient.variantId,
            multiplier: currentIngredient.multiplier,
            recipeTitle: currentIngredient.recipeTitle
          };

          // Categorize based on existing item matching
          if (match.existingItem && match.confidence >= 1.0) {
            allExactMatches.push(enhancedMatch);
          } else if (match.existingItem && match.confidence >= 0.6) {
            allMatches.push(enhancedMatch);
          } else {
            allNewItems.push(enhancedMatch);
          }
        }
      }
    }

    const result = {
      partialMatches: allMatches,
      exactMatches: allExactMatches,
      newItems: allNewItems,
      summary: {
        totalRecipes: recipes.length,
        partialMatchCount: allMatches.length,
        exactMatchCount: allExactMatches.length,
        newItemCount: allNewItems.length
      }
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Analyze recipes error:', error);
    
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