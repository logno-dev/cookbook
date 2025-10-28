import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { createTag, getAllTags } from '~/lib/recipe-service';

export async function GET(event: APIEvent) {
  try {
    await requireAuth(event);
    const tags = await getAllTags();

    return new Response(JSON.stringify({ tags }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get tags error:', error);
    
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
    await requireAuth(event);
    const body = await event.request.json();
    const { name, color } = body;

    if (!name) {
      return new Response(JSON.stringify({ error: 'Tag name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const tagId = await createTag(name, color);

    return new Response(JSON.stringify({ tagId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create tag error:', error);
    
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