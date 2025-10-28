import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { removeMemberFromCookbook, updateMemberRole } from '~/lib/cookbook-service';

export async function DELETE(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const cookbookId = event.params.id;
    const url = new URL(event.request.url);
    const memberUserId = url.searchParams.get('userId');

    if (!memberUserId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const success = await removeMemberFromCookbook(cookbookId, memberUserId, user.id);

    if (!success) {
      return new Response(JSON.stringify({ error: 'Failed to remove member. Check permissions.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Remove cookbook member error:', error);
    
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

    const { userId: memberUserId, role } = body;

    if (!memberUserId || !role) {
      return new Response(JSON.stringify({ error: 'User ID and role are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!['editor', 'contributor', 'reader'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role. Must be editor, contributor, or reader' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const success = await updateMemberRole(cookbookId, memberUserId, role, user.id);

    if (!success) {
      return new Response(JSON.stringify({ error: 'Failed to update member role. Check permissions.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update cookbook member role error:', error);
    
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