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
    const body = await event.request.json();

    const { confirmationName } = body;

    // Get cookbook to verify name matches
    const cookbook = await getCookbookById(cookbookId, user.id);
    if (!cookbook) {
      return new Response(JSON.stringify({ error: 'Cookbook not found or insufficient permissions' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Only owner can delete
    if (cookbook.userRole !== 'owner') {
      return new Response(JSON.stringify({ error: 'Only the cookbook owner can delete the cookbook' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify confirmation name matches cookbook title exactly
    if (confirmationName !== cookbook.title) {
      return new Response(JSON.stringify({ error: 'Cookbook name confirmation does not match' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const success = await deleteCookbook(cookbookId, user.id);

    if (!success) {
      return new Response(JSON.stringify({ error: 'Failed to delete cookbook' }), {
        status: 500,
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