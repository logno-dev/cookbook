import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { removeRecipeFromCookbook } from '~/lib/cookbook-service';

export async function DELETE(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const cookbookId = event.params.id;
    const cookbookRecipeId = event.params.recipeId;

    const success = await removeRecipeFromCookbook(cookbookRecipeId, cookbookId, user.id);

    if (!success) {
      return new Response(JSON.stringify({ error: 'Recipe not found in cookbook or insufficient permissions' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Remove recipe from cookbook error:', error);
    
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