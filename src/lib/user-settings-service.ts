import { db } from '~/db';
import { userSettings } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface UserSettings {
  id: string;
  userId: string;
  // Theme preference
  theme: 'light' | 'dark' | 'system';
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserSettingsData {
  // Theme preference
  theme?: 'light' | 'dark' | 'system';
}

export const DEFAULT_USER_SETTINGS: Omit<UserSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  theme: 'system',
};

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const settings = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).get();

  if (!settings) {
    // Create default settings for the user
    const defaultSettings = {
      id: uuidv4(),
      userId,
      ...DEFAULT_USER_SETTINGS,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(userSettings).values(defaultSettings);
    return defaultSettings;
  }

  return settings as UserSettings;
}

export async function updateUserSettings(userId: string, updates: UpdateUserSettingsData): Promise<UserSettings> {
  const existingSettings = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).get();

  if (!existingSettings) {
    // Create new settings with the updates
    const newSettings = {
      id: uuidv4(),
      userId,
      theme: updates.theme || 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(userSettings).values(newSettings);
    return newSettings as UserSettings;
  } else {
    // Update existing settings
    const updatedData = {
      ...updates,
      updatedAt: new Date(),
    };

    await db.update(userSettings)
      .set(updatedData)
      .where(eq(userSettings.userId, userId));

    const updatedSettings = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).get();
    return updatedSettings as UserSettings;
  }
}

export async function resetUserSettings(userId: string): Promise<UserSettings> {
  const resetData = {
    ...DEFAULT_USER_SETTINGS,
    updatedAt: new Date(),
  };

  await db.update(userSettings)
    .set(resetData)
    .where(eq(userSettings.userId, userId));

  const resetSettings = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).get();
  return resetSettings as UserSettings;
}

export async function deleteUserSettings(userId: string): Promise<void> {
  await db.delete(userSettings).where(eq(userSettings.userId, userId));
}

// Utility function for theme updates
export async function updateTheme(
  userId: string, 
  theme: 'light' | 'dark' | 'system'
): Promise<UserSettings> {
  return updateUserSettings(userId, { theme });
}