import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { inviteUserToCookbook, getCookbookPendingInvitations } from '~/lib/cookbook-service';

export async function POST(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const cookbookId = event.params.id;
    const body = await event.request.json();

    const { inviteeEmail, role, message, expiresAt } = body;

    if (!inviteeEmail || !role) {
      return new Response(JSON.stringify({ error: 'Invitee email and role are required' }), {
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

    const invitationId = await inviteUserToCookbook(
      cookbookId,
      user.id,
      inviteeEmail,
      role,
      message,
      expiresAt ? new Date(expiresAt) : undefined
    );

    if (!invitationId) {
      return new Response(JSON.stringify({ error: 'Failed to send invitation. User may already be a member or have a pending invitation.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ invitationId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Send cookbook invitation error:', error);
    
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

export async function GET(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const cookbookId = event.params.id;

    const invitations = await getCookbookPendingInvitations(cookbookId, user.id);

    return new Response(JSON.stringify({ invitations }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get cookbook invitations error:', error);
    
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