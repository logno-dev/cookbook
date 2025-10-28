import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { GroceryListService } from '~/lib/grocery-list-service';

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

    // Get real items from database
    const items = await GroceryListService.getGroceryListItems(groceryListId);

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get grocery list items error:', error);
    
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
    const { name, quantity, unit, notes, category, order, isCompleted } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Name is required and must be a non-empty string' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add real item to database
    const item = await GroceryListService.addGroceryListItem(groceryListId, {
      name: name.trim(),
      quantity: quantity?.trim() || undefined,
      unit: unit?.trim() || undefined,
      notes: notes?.trim() || undefined,
      category: category?.trim() || undefined,
      order: order || 0,
      isCompleted: isCompleted || false,
    });

    return new Response(JSON.stringify({ item }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Add grocery list item error:', error);
    
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