import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { getRecipeById, updateRecipe, deleteRecipe } from '~/lib/recipe-service';

export async function GET(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const recipeId = event.params.id;

    if (!recipeId) {
      return new Response(JSON.stringify({ error: 'Recipe ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const recipe = await getRecipeById(recipeId, user.id);

    if (!recipe) {
      return new Response(JSON.stringify({ error: 'Recipe not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ recipe }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get recipe error:', error);
    
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

export async function PUT(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const recipeId = event.params.id;
    const body = await event.request.json();

    if (!recipeId) {
      return new Response(JSON.stringify({ error: 'Recipe ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const success = await updateRecipe(recipeId, user.id, body);

    if (!success) {
      return new Response(JSON.stringify({ error: 'Recipe not found or update failed' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update recipe error:', error);
    
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
    const recipeId = event.params.id;

    if (!recipeId) {
      return new Response(JSON.stringify({ error: 'Recipe ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const success = await deleteRecipe(recipeId, user.id);

    if (!success) {
      return new Response(JSON.stringify({ error: 'Recipe not found or delete failed' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete recipe error:', error);
    
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