import { APIEvent } from '@solidjs/start/server';
import { validateSession } from '~/lib/auth';
import { getCookie } from 'vinxi/http';

export async function requireAuth(event: APIEvent) {
  const sessionToken = getCookie(event.nativeEvent, 'session');

  console.log('🔍 requireAuth called:', {
    hasToken: !!sessionToken,
    tokenLength: sessionToken?.length,
    tokenStart: sessionToken?.substring(0, 8) + '...'
  });

  if (!sessionToken) {
    console.log('❌ No session token found');
    throw new Error('Authentication required');
  }

  const user = await validateSession(sessionToken);

  if (!user) {
    console.log('❌ Session validation failed for token:', sessionToken.substring(0, 8) + '...');
    throw new Error('Invalid session');
  }

  console.log('✅ Authentication successful for user:', user.email);
  return user;
}

export async function requireSuperAdmin(event: APIEvent) {
  const user = await requireAuth(event);

  if (!user.isSuperAdmin) {
    throw new Error('Super admin access required');
  }

  return user;
}