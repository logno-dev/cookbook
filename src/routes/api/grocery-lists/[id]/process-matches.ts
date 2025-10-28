import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { GroceryListService } from '~/lib/grocery-list-service';

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
    const { decisions, pendingExactMatches, pendingNewItems } = body;

    if (!decisions || !Array.isArray(decisions)) {
      return new Response(JSON.stringify({ error: 'Decisions array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process each user decision
    for (const decision of decisions) {
      const { ingredient, action, existingItem } = decision;
      
      if (action === 'merge' && existingItem) {
        // User chose to merge - combine quantities
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
      } else if (action === 'separate' || action === 'add') {
        // User chose to keep separate or add as new item
        await GroceryListService.addGroceryListItem(groceryListId, {
          name: ingredient.ingredient,
          quantity: ingredient.quantity?.toString(),
          unit: ingredient.unit,
          notes: ingredient.notes,
          isCompleted: false,
          order: 0,
        });
      }
      // If action === 'skip', do nothing - ingredient is not added
    }

    // After processing user decisions on partial matches, 
    // now process the pending exact matches and new items
    
    // Auto-merge exact matches (100% confidence)
    if (pendingExactMatches && Array.isArray(pendingExactMatches)) {
      for (const match of pendingExactMatches) {
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

    // Add new items
    if (pendingNewItems && Array.isArray(pendingNewItems)) {
      for (const match of pendingNewItems) {
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
      exactMatchesProcessed: pendingExactMatches?.length || 0,
      newItemsAdded: pendingNewItems?.length || 0
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Process matches error:', error);
    
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