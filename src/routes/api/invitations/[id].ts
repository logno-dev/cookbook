import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { respondToInvitation } from '~/lib/cookbook-service';

export async function PUT(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const invitationId = event.params.id;
    const body = await event.request.json();

    const { response } = body;

    if (!response || !['accepted', 'declined'].includes(response)) {
      return new Response(JSON.stringify({ error: 'Response must be "accepted" or "declined"' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const success = await respondToInvitation(invitationId, user.id, response);

    if (!success) {
      return new Response(JSON.stringify({ error: 'Invitation not found or already responded to' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Respond to invitation error:', error);
    
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