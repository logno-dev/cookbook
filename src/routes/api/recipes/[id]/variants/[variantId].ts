import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { updateRecipeVariant, deleteRecipeVariant } from '~/lib/recipe-service';

export async function PUT(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const recipeId = event.params.id;
    const variantId = event.params.variantId;
    const body = await event.request.json();

    if (!recipeId || !variantId) {
      return new Response(JSON.stringify({ error: 'Recipe ID and Variant ID are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const success = await updateRecipeVariant(variantId, recipeId, user.id, body);

    if (!success) {
      return new Response(JSON.stringify({ error: 'Recipe or variant not found or update failed' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update recipe variant error:', error);
    
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
    const variantId = event.params.variantId;

    if (!recipeId || !variantId) {
      return new Response(JSON.stringify({ error: 'Recipe ID and Variant ID are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const success = await deleteRecipeVariant(variantId, recipeId, user.id);

    if (!success) {
      return new Response(JSON.stringify({ error: 'Recipe or variant not found or delete failed' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete recipe variant error:', error);
    
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