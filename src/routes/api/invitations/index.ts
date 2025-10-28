import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { getUserInvitations } from '~/lib/cookbook-service';

export async function GET(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const invitations = await getUserInvitations(user.id);

    return new Response(JSON.stringify({ invitations }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get invitations error:', error);
    
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