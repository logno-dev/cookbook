import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { getCookbookRecipes, addRecipeToCookbook, removeRecipeFromCookbook } from '~/lib/cookbook-service';

export async function GET(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const cookbookId = event.params.id;

    const recipes = await getCookbookRecipes(cookbookId, user.id);

    return new Response(JSON.stringify({ recipes }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get cookbook recipes error:', error);
    
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
    const cookbookId = event.params.id;
    const body = await event.request.json();

    const { recipeId, notes } = body;

    if (!recipeId) {
      return new Response(JSON.stringify({ error: 'Recipe ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cookbookRecipeId = await addRecipeToCookbook(cookbookId, recipeId, user.id, notes);

    if (!cookbookRecipeId) {
      return new Response(JSON.stringify({ error: 'Failed to add recipe to cookbook. Check permissions and recipe ownership.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ cookbookRecipeId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Add recipe to cookbook error:', error);
    
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