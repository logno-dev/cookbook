import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { forkRecipeForCookbook } from '~/lib/cookbook-service';

export async function POST(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const cookbookId = event.params.id;
    const recipeId = event.params.recipeId;
    const body = await event.request.json();

    const { modifications } = body;

    const forkedRecipeId = await forkRecipeForCookbook(
      cookbookId,
      recipeId,
      user.id,
      modifications
    );

    if (!forkedRecipeId) {
      return new Response(JSON.stringify({ error: 'Failed to fork recipe. Check permissions.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ forkedRecipeId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Fork recipe error:', error);
    
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