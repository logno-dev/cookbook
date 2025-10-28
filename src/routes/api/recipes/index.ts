import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { createRecipe, getUserRecipes } from '~/lib/recipe-service';

export async function GET(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const url = new URL(event.request.url);
    
    const filters = {
      query: url.searchParams.get('query') || undefined,
      tagIds: url.searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      cuisine: url.searchParams.get('cuisine') || undefined,
      difficulty: url.searchParams.get('difficulty') || undefined,
      maxCookTime: url.searchParams.get('maxCookTime') ? parseInt(url.searchParams.get('maxCookTime')!) : undefined,
      sortBy: (url.searchParams.get('sortBy') as 'createdAt' | 'title' | 'cookTime') || 'createdAt',
      sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    };

    const recipes = await getUserRecipes(user.id, filters);

    return new Response(JSON.stringify({ recipes }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get recipes error:', error);
    
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
    const body = await event.request.json();

    const { title, description, ingredients, instructions, ...rest } = body;

    if (!title || !ingredients || !instructions) {
      return new Response(JSON.stringify({ error: 'Title, ingredients, and instructions are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!Array.isArray(ingredients) || !Array.isArray(instructions)) {
      return new Response(JSON.stringify({ error: 'Ingredients and instructions must be arrays' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const recipeId = await createRecipe(user.id, {
      title,
      description,
      ingredients,
      instructions,
      ...rest
    });

    return new Response(JSON.stringify({ recipeId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create recipe error:', error);
    
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