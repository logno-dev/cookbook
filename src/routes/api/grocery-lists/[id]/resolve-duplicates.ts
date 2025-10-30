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
    const { resolutions } = body;

    if (!resolutions || !Array.isArray(resolutions)) {
      return new Response(JSON.stringify({ error: 'Resolutions array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let mergedCount = 0;
    let deletedCount = 0;

    // Process each resolution decision
    for (const resolution of resolutions) {
      const { action, primaryItem, duplicateItems } = resolution;
      
      if (action === 'merge') {
        // Merge all duplicate items into the primary item
        let combinedQuantity = primaryItem.quantity;
        let combinedUnit = primaryItem.unit;
        let combinedNotes = primaryItem.notes;

        // Combine quantities and notes from all duplicate items
        for (const duplicateItem of duplicateItems) {
          if (duplicateItem.quantity) {
            const combined = GroceryListService.combineQuantities(
              combinedQuantity,
              duplicateItem.quantity,
              combinedUnit,
              duplicateItem.unit
            );
            combinedQuantity = combined.quantity;
            combinedUnit = combined.unit;
          }

          // Combine notes
          if (duplicateItem.notes && duplicateItem.notes !== combinedNotes) {
            combinedNotes = combinedNotes 
              ? `${combinedNotes}; ${duplicateItem.notes}`
              : duplicateItem.notes;
          }
        }

        // Update the primary item with combined data
        await GroceryListService.updateGroceryListItem(primaryItem.id, {
          quantity: combinedQuantity,
          unit: combinedUnit,
          notes: combinedNotes,
        });

        // Delete all duplicate items
        for (const duplicateItem of duplicateItems) {
          await GroceryListService.deleteGroceryListItem(duplicateItem.id);
          deletedCount++;
        }

        mergedCount++;
      }
      // If action === 'keep_separate', do nothing - keep items as they are
    }

    return new Response(JSON.stringify({ 
      success: true,
      mergedGroups: mergedCount,
      deletedItems: deletedCount
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Resolve duplicates error:', error);
    
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