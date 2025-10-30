import { APIEvent } from '@solidjs/start/server';
import { authenticateUser, createSession } from '~/lib/auth';
import { setCookie } from 'vinxi/http';

export async function POST(event: APIEvent) {
  try {
    const body = await event.request.json();
    const { email, password } = body;

    console.log('🔍 Login API called:', {
      email,
      passwordLength: password?.length,
      hasEmail: !!email,
      hasPassword: !!password
    });

    if (!email || !password) {
      console.log('❌ Missing email or password');
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = await authenticateUser(email, password);

    if (!user) {
      console.log('❌ Authentication failed for:', email);
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Authentication successful for:', email);

    const sessionToken = await createSession(user.id);

    setCookie(event.nativeEvent, 'session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    });

    return new Response(JSON.stringify({ 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name 
      } 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}