import { APIEvent } from '@solidjs/start/server';
import { validateSession } from '~/lib/auth';
import { getCookie } from 'vinxi/http';

export async function requireAuth(event: APIEvent) {
  const sessionToken = getCookie(event.nativeEvent, 'session');

  if (!sessionToken) {
    throw new Error('Authentication required');
  }

  const user = await validateSession(sessionToken);

  if (!user) {
    throw new Error('Invalid session');
  }

  return user;
}