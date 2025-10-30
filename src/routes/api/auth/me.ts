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

    // Debug logging
    console.log('🔍 Auth check for user:', {
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      userObject: user
    });

    // Create response exactly like debug endpoint
    const responseData = { 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSuperAdmin: user.isSuperAdmin
      }
    };
    
    const jsonString = JSON.stringify(responseData);
    console.log('🔍 JSON response string:', jsonString);
    console.log('🔍 Parsed back:', JSON.parse(jsonString));

    return new Response(jsonString, {
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