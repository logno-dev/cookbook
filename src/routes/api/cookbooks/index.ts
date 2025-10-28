import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { createCookbook, getUserCookbooks } from '~/lib/cookbook-service';

export async function GET(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const cookbooks = await getUserCookbooks(user.id);

    return new Response(JSON.stringify({ cookbooks }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get cookbooks error:', error);
    
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

    const { title, description, isPublic } = body;

    if (!title) {
      return new Response(JSON.stringify({ error: 'Title is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cookbookId = await createCookbook(user.id, {
      title,
      description,
      isPublic: isPublic || false,
    });

    return new Response(JSON.stringify({ cookbookId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create cookbook error:', error);
    
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