import { json } from '@solidjs/router';
import { APIEvent } from '@solidjs/start/server';
import { requireSuperAdmin } from '~/lib/middleware';
import { db } from '~/db';
import { 
  users, 
  recipes, 
  cookbooks, 
  groceryLists, 
  tags, 
  cookbookInvitations,
  recipeVariants,
  groceryListItems
} from '~/db/schema';
import { count, sql, desc, eq } from 'drizzle-orm';

export async function GET(event: APIEvent) {
  try {
    console.log('🔍 Admin stats endpoint called');
    // Verify super admin access
    const user = await requireSuperAdmin(event);
    console.log('🔍 Super admin verified:', user.email);

    // Get overall statistics
    const [
      totalUsers,
      totalRecipes,
      totalCookbooks,
      totalGroceryLists,
      totalTags,
      totalInvitations,
      totalVariants,
      totalGroceryItems
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(recipes),
      db.select({ count: count() }).from(cookbooks),
      db.select({ count: count() }).from(groceryLists),
      db.select({ count: count() }).from(tags),
      db.select({ count: count() }).from(cookbookInvitations),
      db.select({ count: count() }).from(recipeVariants),
      db.select({ count: count() }).from(groceryListItems)
    ]);

    // Get recent user registrations (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [recentUsers] = await db.select({ count: count() })
      .from(users)
      .where(sql`${users.createdAt} > ${thirtyDaysAgo}`);

    // Get top recipe creators
    const topRecipeCreators = await db.select({
      userEmail: users.email,
      userName: users.name,
      recipeCount: count(recipes.id)
    })
    .from(users)
    .leftJoin(recipes, eq(users.id, recipes.userId))
    .groupBy(users.id, users.email, users.name)
    .orderBy(desc(count(recipes.id)))
    .limit(10);

    // Get popular tags (most used)
    const popularTags = await db.select({
      tagName: tags.name,
      tagColor: tags.color,
      usageCount: sql<number>`count(recipe_tags.id)`
    })
    .from(tags)
    .leftJoin(sql`recipe_tags`, eq(tags.id, sql`recipe_tags.tag_id`))
    .groupBy(tags.id, tags.name, tags.color)
    .orderBy(desc(sql`count(recipe_tags.id)`))
    .limit(10);

    // Get cookbook statistics
    const cookbookStats = await db.select({
      totalMembers: sql<number>`count(cookbook_members.id)`,
      averageRecipesPerCookbook: sql<number>`avg(recipe_count)`,
      publicCookbooks: sql<number>`sum(case when is_public = 1 then 1 else 0 end)`
    })
    .from(sql`(
      SELECT 
        cookbooks.id,
        cookbooks.is_public,
        count(cookbook_recipes.id) as recipe_count
      FROM cookbooks
      LEFT JOIN cookbook_recipes ON cookbooks.id = cookbook_recipes.cookbook_id
      GROUP BY cookbooks.id
    ) as cookbook_data`)
    .leftJoin(sql`cookbook_members`, sql`cookbook_data.id = cookbook_members.cookbook_id`);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [recentRecipes] = await db.select({ count: count() })
      .from(recipes)
      .where(sql`${recipes.createdAt} > ${sevenDaysAgo}`);

    const [recentCookbooks] = await db.select({ count: count() })
      .from(cookbooks)
      .where(sql`${cookbooks.createdAt} > ${sevenDaysAgo}`);

    const [recentGroceryLists] = await db.select({ count: count() })
      .from(groceryLists)
      .where(sql`${groceryLists.createdAt} > ${sevenDaysAgo}`);

    return json({
      overview: {
        totalUsers: totalUsers[0].count,
        totalRecipes: totalRecipes[0].count,
        totalCookbooks: totalCookbooks[0].count,
        totalGroceryLists: totalGroceryLists[0].count,
        totalTags: totalTags[0].count,
        totalInvitations: totalInvitations[0].count,
        totalVariants: totalVariants[0].count,
        totalGroceryItems: totalGroceryItems[0].count
      },
      growth: {
        newUsersLast30Days: recentUsers.count,
        newRecipesLast7Days: recentRecipes.count,
        newCookbooksLast7Days: recentCookbooks.count,
        newGroceryListsLast7Days: recentGroceryLists.count
      },
      topContributors: topRecipeCreators.map(creator => ({
        email: creator.userEmail,
        name: creator.userName || 'Unknown',
        recipeCount: creator.recipeCount
      })),
      popularTags: popularTags.map(tag => ({
        name: tag.tagName,
        color: tag.tagColor,
        usageCount: tag.usageCount
      })),
      cookbookInsights: {
        totalMembers: cookbookStats[0]?.totalMembers || 0,
        averageRecipesPerCookbook: Math.round(cookbookStats[0]?.averageRecipesPerCookbook || 0),
        publicCookbooks: cookbookStats[0]?.publicCookbooks || 0
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    
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