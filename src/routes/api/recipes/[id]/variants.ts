import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { createRecipeVariant, getRecipeVariants } from '~/lib/recipe-service';

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

    const variants = await getRecipeVariants(recipeId, user.id);

    return new Response(JSON.stringify({ variants }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get recipe variants error:', error);
    
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
    const recipeId = event.params.id;
    const body = await event.request.json();

    if (!recipeId) {
      return new Response(JSON.stringify({ error: 'Recipe ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const variantId = await createRecipeVariant(recipeId, user.id, body);

    if (!variantId) {
      return new Response(JSON.stringify({ error: 'Recipe not found or variant creation failed' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ variantId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create recipe variant error:', error);
    
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