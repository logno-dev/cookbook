import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { getCookbookById, updateCookbook, deleteCookbook } from '~/lib/cookbook-service';

export async function GET(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const cookbookId = event.params.id;

    const cookbook = await getCookbookById(cookbookId, user.id);

    if (!cookbook) {
      return new Response(JSON.stringify({ error: 'Cookbook not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ cookbook }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get cookbook error:', error);
    
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
    const cookbookId = event.params.id;
    const body = await event.request.json();

    const { title, description, isPublic } = body;

    const success = await updateCookbook(cookbookId, user.id, {
      title,
      description,
      isPublic,
    });

    if (!success) {
      return new Response(JSON.stringify({ error: 'Cookbook not found or insufficient permissions' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update cookbook error:', error);
    
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
    const cookbookId = event.params.id;

    const success = await deleteCookbook(cookbookId, user.id);

    if (!success) {
      return new Response(JSON.stringify({ error: 'Cookbook not found or insufficient permissions' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete cookbook error:', error);
    
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