import { APIEvent } from '@solidjs/start/server';
import { validateSession } from '~/lib/auth';
import { getCookie } from 'vinxi/http';

export async function GET(event: APIEvent) {
  try {
    const sessionToken = getCookie(event.nativeEvent, 'session');

    if (!sessionToken) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = await validateSession(sessionToken);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Auth check error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}