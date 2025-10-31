import { APIEvent } from '@solidjs/start/server';
import { createUser, createSession } from '~/lib/auth';
import { sendWelcomeEmail } from '~/lib/email';
import { linkPendingInvitations } from '~/lib/cookbook-service';
import { setCookie } from 'vinxi/http';

export async function POST(event: APIEvent) {
  try {
    const body = await event.request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters long' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = await createUser({ email, password, name });

    // Create a session for the newly registered user (auto-login)
    const sessionToken = await createSession(user.id);

    setCookie(event.nativeEvent, 'session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    });

    // Link any pending cookbook invitations to this new user
    try {
      await linkPendingInvitations(user.id, email);
    } catch (invitationError) {
      console.warn('Failed to link pending invitations:', invitationError);
    }

    try {
      await sendWelcomeEmail(email, name);
    } catch (emailError) {
      console.warn('Failed to send welcome email:', emailError);
    }

    return new Response(JSON.stringify({ 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name 
      } 
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof Error && error.message === 'User already exists') {
      return new Response(JSON.stringify({ error: 'User already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}