import { APIEvent } from '@solidjs/start/server';
import { deleteSession } from '~/lib/auth';
import { getCookie, setCookie } from 'vinxi/http';

export async function POST(event: APIEvent) {
  try {
    const sessionToken = getCookie(event.nativeEvent, 'session');

    if (sessionToken) {
      await deleteSession(sessionToken);
    }

    setCookie(event.nativeEvent, 'session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}