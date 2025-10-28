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

    const groceryList = await GroceryListService.getGroceryList(groceryListId, user.id);
    
    if (!groceryList) {
      return new Response(JSON.stringify({ error: 'Grocery list not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ groceryList }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get grocery list error:', error);
    
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
    
    if (!groceryListId) {
      return new Response(JSON.stringify({ error: 'Grocery list ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const success = await GroceryListService.deleteGroceryList(groceryListId, user.id);
    
    if (!success) {
      return new Response(JSON.stringify({ error: 'Grocery list not found or could not be deleted' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ message: 'Grocery list deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete grocery list error:', error);
    
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