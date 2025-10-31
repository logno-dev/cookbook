import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  isSuperAdmin: integer('is_super_admin', { mode: 'boolean' }),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  ingredients: text('ingredients', { mode: 'json' }).$type<Array<{
    quantity?: string;
    unit?: string;
    ingredient: string;
    notes?: string;
  }>>().notNull(),
  instructions: text('instructions', { mode: 'json' }).$type<Array<{
    step: number;
    instruction: string;
    time?: number;
    temperature?: string;
  }>>().notNull(),
  servings: integer('servings'),
  yield: text('yield'),
  cookTime: integer('cook_time'),
  prepTime: integer('prep_time'),
  totalTime: integer('total_time'),
  restTime: integer('rest_time'),
  difficulty: text('difficulty'),
  cuisine: text('cuisine'),
  category: text('category'),
  diet: text('diet'),
  imageUrl: text('image_url'),
  sourceUrl: text('source_url'),
  sourceAuthor: text('source_author'),
  equipment: text('equipment', { mode: 'json' }).$type<string[]>(),
  notes: text('notes'),
  nutrition: text('nutrition', { mode: 'json' }).$type<{
    calories?: number;
    protein?: string;
    carbohydrates?: string;
    fat?: string;
    saturatedFat?: string;
    cholesterol?: string;
    sodium?: string;
    fiber?: string;
    sugar?: string;
    servingSize?: string;
    servingsPerContainer?: number;
  }>(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color').default('#64748b'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

export const recipeTags = sqliteTable('recipe_tags', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
});

export const recipeVariants = sqliteTable('recipe_variants', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g., "Vegan Version", "Low Sodium", "Spicy"
  description: text('description'),
  // Only store fields that differ from the original recipe
  ingredients: text('ingredients', { mode: 'json' }).$type<Array<{
    quantity?: string;
    unit?: string;
    ingredient: string;
    notes?: string;
  }>>(),
  instructions: text('instructions', { mode: 'json' }).$type<Array<{
    step: number;
    instruction: string;
    time?: number;
    temperature?: string;
  }>>(),
  servings: integer('servings'),
  yield: text('yield'),
  cookTime: integer('cook_time'),
  prepTime: integer('prep_time'),
  totalTime: integer('total_time'),
  restTime: integer('rest_time'),
  difficulty: text('difficulty'),
  cuisine: text('cuisine'),
  category: text('category'),
  diet: text('diet'),
  imageUrl: text('image_url'),
  sourceUrl: text('source_url'),
  sourceAuthor: text('source_author'),
  equipment: text('equipment', { mode: 'json' }).$type<string[]>(),
  notes: text('notes'),
  nutrition: text('nutrition', { mode: 'json' }).$type<{
    calories?: number;
    protein?: string;
    carbohydrates?: string;
    fat?: string;
    saturatedFat?: string;
    cholesterol?: string;
    sodium?: string;
    fiber?: string;
    sugar?: string;
    servingSize?: string;
    servingsPerContainer?: number;
  }>(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const cookbooks = sqliteTable('cookbooks', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  isPublic: integer('is_public', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const cookbookMembers = sqliteTable('cookbook_members', {
  id: text('id').primaryKey(),
  cookbookId: text('cookbook_id').notNull().references(() => cookbooks.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().$type<'owner' | 'editor' | 'contributor' | 'reader'>(),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull(),
});

export const cookbookRecipes = sqliteTable('cookbook_recipes', {
  id: text('id').primaryKey(),
  cookbookId: text('cookbook_id').notNull().references(() => cookbooks.id, { onDelete: 'cascade' }),
  recipeId: text('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  addedByUserId: text('added_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  originalRecipeId: text('original_recipe_id').references(() => recipes.id, { onDelete: 'set null' }), // For tracking forked recipes
  notes: text('notes'), // Optional notes about the recipe in this cookbook
  addedAt: integer('added_at', { mode: 'timestamp' }).notNull(),
});

export const cookbookInvitations = sqliteTable('cookbook_invitations', {
  id: text('id').primaryKey(),
  cookbookId: text('cookbook_id').notNull().references(() => cookbooks.id, { onDelete: 'cascade' }),
  inviterUserId: text('inviter_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  inviteeEmail: text('invitee_email').notNull(),
  inviteeUserId: text('invitee_user_id').references(() => users.id, { onDelete: 'cascade' }), // null if user doesn't exist yet
  role: text('role').notNull().$type<'editor' | 'contributor' | 'reader'>(),
  status: text('status').notNull().$type<'pending' | 'accepted' | 'declined' | 'expired'>().default('pending'),
  message: text('message'), // Optional message from inviter
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }), // Optional expiration
});

export const userSessions = sqliteTable('user_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

export const passwordResetCodes = sqliteTable('password_reset_codes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  code: text('code').notNull(), // 6-digit verification code
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  isUsed: integer('is_used', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

export const userSettings = sqliteTable('user_settings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  // Display preferences
  theme: text('theme').$type<'light' | 'dark' | 'system'>().default('system'),
  language: text('language').default('en'),
  timezone: text('timezone').default('UTC'),
  // Recipe preferences
  defaultServingSize: integer('default_serving_size').default(4),
  preferredUnits: text('preferred_units').$type<'metric' | 'imperial'>().default('metric'),
  showNutritionInfo: integer('show_nutrition_info', { mode: 'boolean' }).default(true),
  showCookingTips: integer('show_cooking_tips', { mode: 'boolean' }).default(true),
  // Privacy settings
  profileVisibility: text('profile_visibility').$type<'public' | 'friends' | 'private'>().default('private'),
  allowCookbookInvitations: integer('allow_cookbook_invitations', { mode: 'boolean' }).default(true),
  // Notification preferences
  emailNotifications: integer('email_notifications', { mode: 'boolean' }).default(true),
  cookbookInviteNotifications: integer('cookbook_invite_notifications', { mode: 'boolean' }).default(true),
  recipeUpdateNotifications: integer('recipe_update_notifications', { mode: 'boolean' }).default(false),
  weeklyDigest: integer('weekly_digest', { mode: 'boolean' }).default(false),
  // Grocery list preferences
  defaultGroceryListView: text('default_grocery_list_view').$type<'category' | 'alphabetical' | 'custom'>().default('category'),
  autoCompleteGroceryItems: integer('auto_complete_grocery_items', { mode: 'boolean' }).default(false),
  // Advanced preferences (stored as JSON for flexibility)
  customPreferences: text('custom_preferences', { mode: 'json' }).$type<Record<string, any>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const groceryLists = sqliteTable('grocery_lists', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const groceryListItems = sqliteTable('grocery_list_items', {
  id: text('id').primaryKey(),
  groceryListId: text('grocery_list_id').notNull().references(() => groceryLists.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  quantity: text('quantity'),
  unit: text('unit'),
  notes: text('notes'),
  isCompleted: integer('is_completed', { mode: 'boolean' }).default(false),
  category: text('category'),
  order: integer('order').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

export const groceryListRecipes = sqliteTable('grocery_list_recipes', {
  id: text('id').primaryKey(),
  groceryListId: text('grocery_list_id').notNull().references(() => groceryLists.id, { onDelete: 'cascade' }),
  recipeId: text('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  variantId: text('variant_id').references(() => recipeVariants.id, { onDelete: 'set null' }),
  multiplier: real('multiplier').default(1),
  addedAt: integer('added_at', { mode: 'timestamp' }).notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  recipes: many(recipes),
  sessions: many(userSessions),
  passwordResetCodes: many(passwordResetCodes),
  settings: one(userSettings),
  ownedCookbooks: many(cookbooks),
  cookbookMemberships: many(cookbookMembers),
  cookbookInvitationsSent: many(cookbookInvitations, { relationName: 'inviter' }),
  cookbookInvitationsReceived: many(cookbookInvitations, { relationName: 'invitee' }),
  // groceryLists: many(groceryLists), // Causing crashes, will add separately
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  user: one(users, {
    fields: [recipes.userId],
    references: [users.id],
  }),
  recipeTags: many(recipeTags),
  variants: many(recipeVariants),
  cookbookRecipes: many(cookbookRecipes),
  originalCookbookRecipes: many(cookbookRecipes, { relationName: 'originalRecipe' }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  recipeTags: many(recipeTags),
}));

export const recipeTagsRelations = relations(recipeTags, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeTags.recipeId],
    references: [recipes.id],
  }),
  tag: one(tags, {
    fields: [recipeTags.tagId],
    references: [tags.id],
  }),
}));

export const recipeVariantsRelations = relations(recipeVariants, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeVariants.recipeId],
    references: [recipes.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const passwordResetCodesRelations = relations(passwordResetCodes, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetCodes.userId],
    references: [users.id],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

export const cookbooksRelations = relations(cookbooks, ({ one, many }) => ({
  owner: one(users, {
    fields: [cookbooks.ownerId],
    references: [users.id],
  }),
  members: many(cookbookMembers),
  recipes: many(cookbookRecipes),
  invitations: many(cookbookInvitations),
}));

export const cookbookMembersRelations = relations(cookbookMembers, ({ one }) => ({
  cookbook: one(cookbooks, {
    fields: [cookbookMembers.cookbookId],
    references: [cookbooks.id],
  }),
  user: one(users, {
    fields: [cookbookMembers.userId],
    references: [users.id],
  }),
}));

export const cookbookRecipesRelations = relations(cookbookRecipes, ({ one }) => ({
  cookbook: one(cookbooks, {
    fields: [cookbookRecipes.cookbookId],
    references: [cookbooks.id],
  }),
  recipe: one(recipes, {
    fields: [cookbookRecipes.recipeId],
    references: [recipes.id],
  }),
  addedByUser: one(users, {
    fields: [cookbookRecipes.addedByUserId],
    references: [users.id],
  }),
  originalRecipe: one(recipes, {
    fields: [cookbookRecipes.originalRecipeId],
    references: [recipes.id],
    relationName: 'originalRecipe',
  }),
}));

export const cookbookInvitationsRelations = relations(cookbookInvitations, ({ one }) => ({
  cookbook: one(cookbooks, {
    fields: [cookbookInvitations.cookbookId],
    references: [cookbooks.id],
  }),
  inviter: one(users, {
    fields: [cookbookInvitations.inviterUserId],
    references: [users.id],
    relationName: 'inviter',
  }),
  invitee: one(users, {
    fields: [cookbookInvitations.inviteeUserId],
    references: [users.id],
    relationName: 'invitee',
  }),
}));

export const groceryListsRelations = relations(groceryLists, ({ one, many }) => ({
  user: one(users, {
    fields: [groceryLists.userId],
    references: [users.id],
  }),
  items: many(groceryListItems),
  recipes: many(groceryListRecipes),
}));

export const groceryListItemsRelations = relations(groceryListItems, ({ one }) => ({
  groceryList: one(groceryLists, {
    fields: [groceryListItems.groceryListId],
    references: [groceryLists.id],
  }),
}));

export const groceryListRecipesRelations = relations(groceryListRecipes, ({ one }) => ({
  groceryList: one(groceryLists, {
    fields: [groceryListRecipes.groceryListId],
    references: [groceryLists.id],
  }),
  recipe: one(recipes, {
    fields: [groceryListRecipes.recipeId],
    references: [recipes.id],
  }),
  variant: one(recipeVariants, {
    fields: [groceryListRecipes.variantId],
    references: [recipeVariants.id],
  }),
}));