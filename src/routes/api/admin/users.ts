import { json } from '@solidjs/router';
import { APIEvent } from '@solidjs/start/server';
import { requireSuperAdmin } from '~/lib/middleware';
import { db } from '~/db';
import { users, recipes, cookbooks, userSessions } from '~/db/schema';
import { count, desc, eq, sql } from 'drizzle-orm';

export async function GET(event: APIEvent) {
  try {
    console.log('🔍 Admin users endpoint called');
    // Verify super admin access
    const adminUser = await requireSuperAdmin(event);
    console.log('🔍 Super admin verified:', adminUser.email);

    // Get all users with their activity stats
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      isSuperAdmin: users.isSuperAdmin,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      recipeCount: sql<number>`count(distinct ${recipes.id})`,
      cookbookCount: sql<number>`count(distinct ${cookbooks.id})`,
      lastSessionAt: sql<Date>`max(${userSessions.createdAt})`
    })
    .from(users)
    .leftJoin(recipes, eq(users.id, recipes.userId))
    .leftJoin(cookbooks, eq(users.id, cookbooks.ownerId))
    .leftJoin(userSessions, eq(users.id, userSessions.userId))
    .groupBy(users.id, users.email, users.name, users.isSuperAdmin, users.createdAt, users.updatedAt)
    .orderBy(desc(users.createdAt));

    console.log(`🔍 Found ${allUsers.length} users`);

    return json({
      users: allUsers.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name || 'No name set',
        isSuperAdmin: Boolean(user.isSuperAdmin),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        recipeCount: user.recipeCount || 0,
        cookbookCount: user.cookbookCount || 0,
        lastSessionAt: user.lastSessionAt,
        // Calculate account age in days
        accountAgeInDays: user.createdAt ? Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0
      }))
    });
  } catch (error) {
    console.error('Admin users error:', error);
    
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