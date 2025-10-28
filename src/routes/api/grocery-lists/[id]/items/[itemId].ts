import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { GroceryListService } from '~/lib/grocery-list-service';

export async function PATCH(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const groceryListId = event.params?.id;
    const itemId = event.params?.itemId;
    
    if (!groceryListId || !itemId) {
      return new Response(JSON.stringify({ error: 'Grocery list ID and item ID are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify user owns the grocery list
    const groceryList = await GroceryListService.getGroceryList(groceryListId, user.id);
    if (!groceryList) {
      return new Response(JSON.stringify({ error: 'Grocery list not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await event.request.json();
    const { name, quantity, unit, notes, category, order, isCompleted } = body;

    const updates: any = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return new Response(JSON.stringify({ error: 'Name must be a non-empty string' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      updates.name = name.trim();
    }
    if (quantity !== undefined) updates.quantity = quantity?.trim() || undefined;
    if (unit !== undefined) updates.unit = unit?.trim() || undefined;
    if (notes !== undefined) updates.notes = notes?.trim() || undefined;
    if (category !== undefined) updates.category = category?.trim() || undefined;
    if (order !== undefined) updates.order = order;
    if (isCompleted !== undefined) updates.isCompleted = Boolean(isCompleted);

    const item = await GroceryListService.updateGroceryListItem(itemId, updates);

    if (!item) {
      return new Response(JSON.stringify({ error: 'Item not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ item }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update grocery list item error:', error);
    
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

export async function DELETE(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const groceryListId = event.params?.id;
    const itemId = event.params?.itemId;
    
    if (!groceryListId || !itemId) {
      return new Response(JSON.stringify({ error: 'Grocery list ID and item ID are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify user owns the grocery list
    const groceryList = await GroceryListService.getGroceryList(groceryListId, user.id);
    if (!groceryList) {
      return new Response(JSON.stringify({ error: 'Grocery list not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const success = await GroceryListService.deleteGroceryListItem(itemId);

    if (!success) {
      return new Response(JSON.stringify({ error: 'Item not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete grocery list item error:', error);
    
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