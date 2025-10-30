import { json } from '@solidjs/router';
import { APIEvent } from '@solidjs/start/server';
import { requireSuperAdmin } from '~/lib/middleware';
import { db } from '~/db';
import { users } from '~/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(event: APIEvent) {
  try {
    console.log('🔍 Admin promote user endpoint called');
    // Verify super admin access
    const adminUser = await requireSuperAdmin(event);
    console.log('🔍 Super admin verified:', adminUser.email);

    const userId = event.params.id;
    if (!userId) {
      return new Response('User ID required', { status: 400 });
    }

    // Update user to be super admin
    const [updatedUser] = await db.update(users)
      .set({ 
        isSuperAdmin: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        isSuperAdmin: users.isSuperAdmin
      });

    if (!updatedUser) {
      return new Response('User not found', { status: 404 });
    }

    console.log(`🔍 Promoted user ${updatedUser.email} to super admin`);

    return json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Admin promote user error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Authentication required' || error.message === 'Invalid session') {
        return new Response('Unauthorized', { status: 401 });
      }
      if (error.message === 'Super admin access required') {
        return new Response('Forbidden', { status: 403 });
      }
    }

    return new Response('Internal Server Error', { status: 500 });
  }
}