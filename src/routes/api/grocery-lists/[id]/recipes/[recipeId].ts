import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { GroceryListService } from '~/lib/grocery-list-service';

export async function DELETE(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const groceryListId = event.params?.id;
    const groceryListRecipeId = event.params?.recipeId;

    if (!groceryListId || !groceryListRecipeId) {
      return new Response(JSON.stringify({ error: 'Grocery list ID and grocery list recipe ID are required' }), {
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

    // Remove recipe from grocery list (this only removes the recipe reference, not the ingredients)
    const success = await GroceryListService.removeRecipeFromGroceryList(groceryListRecipeId);

    if (!success) {
      return new Response(JSON.stringify({ error: 'Recipe not found in grocery list' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error removing recipe from grocery list:', error);
    
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