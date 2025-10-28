import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { forkRecipe } from '~/lib/recipe-service';

export async function POST(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const sourceRecipeId = event.params.id;
    const body = await event.request.json();

    const { newTitle } = body;

    const forkedRecipeId = await forkRecipe(sourceRecipeId, user.id, newTitle);

    if (!forkedRecipeId) {
      return new Response(JSON.stringify({ error: 'Recipe not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ recipeId: forkedRecipeId }), {
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