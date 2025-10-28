import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { resendCookbookInvitation } from '~/lib/cookbook-service';

export async function POST(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const invitationId = event.params.invitationId;

    if (!invitationId) {
      return new Response(JSON.stringify({ error: 'Invitation ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const success = await resendCookbookInvitation(invitationId, user.id);

    if (!success) {
      return new Response(JSON.stringify({ error: 'Failed to resend invitation. Check permissions or invitation status.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Resend invitation error:', error);
    
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