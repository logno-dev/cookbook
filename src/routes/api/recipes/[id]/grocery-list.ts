import type { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { db } from '~/db';
import { createRecipeGroceryList, RecipeGroceryListError } from '~/lib/create-recipe-grocery-list';

export async function POST(event: APIEvent) {
  let user;
  try {
    user = await requireAuth(event);
  } catch {
    return Response.json({ error: 'Sign in to create a grocery list.' }, { status: 401 });
  }
  let body;
  try {
    body = await event.request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
  } catch {
    return Response.json({ error: 'Invalid grocery list request.' }, { status: 400 });
  }
  try {
    const groceryList = await createRecipeGroceryList(db, user.id, event.params.id, {
      variantId: body.variantId,
      multiplier: body.multiplier,
    });
    return Response.json({ groceryList }, { status: 201 });
  } catch (error) {
    if (error instanceof RecipeGroceryListError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Create grocery list from recipe failed:', error);
    return Response.json({ error: 'Could not create the grocery list. Please try again.' }, { status: 500 });
  }
}
