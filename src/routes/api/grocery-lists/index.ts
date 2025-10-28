import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { GroceryListService } from '~/lib/grocery-list-service';

export async function GET(event: APIEvent) {
  try {
    console.log('GET /api/grocery-lists called');
    const user = await requireAuth(event);
    console.log('User authenticated:', user.id);
    
    const groceryLists = await GroceryListService.getUserGroceryLists(user.id);

    return new Response(JSON.stringify({ groceryLists }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get grocery lists error:', error);
    
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
    console.log('POST /api/grocery-lists called');
    const user = await requireAuth(event);
    console.log('User authenticated:', user.id);
    const body = await event.request.json();

    const { name, description } = body;

    if (!name) {
      return new Response(JSON.stringify({ error: 'Name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const groceryList = await GroceryListService.createGroceryList(user.id, name, description);

    return new Response(JSON.stringify({ groceryList }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create grocery list error:', error);
    
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