import { APIEvent } from '@solidjs/start/server';
import { validateSession } from '~/lib/auth';
import { getCookie } from 'vinxi/http';
import { db } from '~/db';
import { userSettings } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

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

    // Get user settings or create default ones
    let settings = await db.select().from(userSettings).where(eq(userSettings.userId, user.id)).get();

    if (!settings) {
      // Create default settings for the user
      const defaultSettings = {
        id: uuidv4(),
        userId: user.id,
        theme: 'system' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(userSettings).values(defaultSettings);
      settings = defaultSettings;
    }

    return new Response(JSON.stringify({ settings }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching user settings:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT(event: APIEvent) {
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

    const body = await event.request.json();
    const updates = { ...body, updatedAt: new Date() };
    
    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.userId;
    delete updates.createdAt;

    // Check if settings exist
    const existingSettings = await db.select().from(userSettings).where(eq(userSettings.userId, user.id)).get();

    if (!existingSettings) {
      // Create new settings with the updates
      const newSettings = {
        id: uuidv4(),
        userId: user.id,
        theme: updates.theme || 'system',
        language: updates.language || 'en',
        timezone: updates.timezone || 'UTC',
        defaultServingSize: updates.defaultServingSize || 4,
        preferredUnits: updates.preferredUnits || 'metric',
        showNutritionInfo: updates.showNutritionInfo !== undefined ? updates.showNutritionInfo : true,
        showCookingTips: updates.showCookingTips !== undefined ? updates.showCookingTips : true,
        profileVisibility: updates.profileVisibility || 'private',
        allowCookbookInvitations: updates.allowCookbookInvitations !== undefined ? updates.allowCookbookInvitations : true,
        emailNotifications: updates.emailNotifications !== undefined ? updates.emailNotifications : true,
        cookbookInviteNotifications: updates.cookbookInviteNotifications !== undefined ? updates.cookbookInviteNotifications : true,
        recipeUpdateNotifications: updates.recipeUpdateNotifications !== undefined ? updates.recipeUpdateNotifications : false,
        weeklyDigest: updates.weeklyDigest !== undefined ? updates.weeklyDigest : false,
        defaultGroceryListView: updates.defaultGroceryListView || 'category',
        autoCompleteGroceryItems: updates.autoCompleteGroceryItems !== undefined ? updates.autoCompleteGroceryItems : false,
        customPreferences: updates.customPreferences || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(userSettings).values(newSettings);
      
      return new Response(JSON.stringify({ settings: newSettings }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Update existing settings
      await db.update(userSettings)
        .set(updates)
        .where(eq(userSettings.userId, user.id));

      const updatedSettings = await db.select().from(userSettings).where(eq(userSettings.userId, user.id)).get();

      return new Response(JSON.stringify({ settings: updatedSettings }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error updating user settings:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}