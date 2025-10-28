import { db } from '~/db';
import { cookbooks, cookbookMembers, cookbookRecipes, cookbookInvitations, recipes, users } from '~/db/schema';
import { eq, and, like, or, desc, asc, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { createRecipe, getRecipeById, type CreateRecipeData, type RecipeWithTags } from './recipe-service';
import { sendCookbookInvitationEmail } from './email';

export interface CreateCookbookData {
  title: string;
  description?: string;
  isPublic?: boolean;
}

export interface UpdateCookbookData extends Partial<CreateCookbookData> {}

export interface CookbookMember {
  id: string;
  userId: string;
  role: 'owner' | 'editor' | 'contributor' | 'reader';
  joinedAt: Date;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface CookbookWithMembers {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  members: CookbookMember[];
  userRole: 'owner' | 'editor' | 'contributor' | 'reader';
}

export interface CookbookRecipe {
  id: string;
  cookbookId: string;
  recipe: RecipeWithTags;
  addedByUserId: string;
  originalRecipeId?: string;
  notes?: string;
  addedAt: Date;
  addedByUser: {
    id: string;
    email: string;
    name?: string;
  };
  canEdit: boolean; // Whether current user can edit this recipe
  isOriginalOwner: boolean; // Whether current user owns the original recipe
}

export interface CookbookInvitation {
  id: string;
  cookbookId: string;
  inviterUserId: string;
  inviteeEmail: string;
  inviteeUserId?: string;
  role: 'editor' | 'contributor' | 'reader';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  message?: string;
  createdAt: Date;
  expiresAt?: Date;
  cookbook: {
    id: string;
    title: string;
    description?: string;
  };
  inviter: {
    id: string;
    email: string;
    name?: string;
  };
}

export async function createCookbook(userId: string, data: CreateCookbookData): Promise<string> {
  const cookbookId = uuidv4();
  
  await db.transaction(async (tx) => {
    // Create the cookbook
    await tx.insert(cookbooks).values({
      id: cookbookId,
      ownerId: userId,
      title: data.title,
      description: data.description,
      isPublic: data.isPublic || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add the owner as a member with owner role
    await tx.insert(cookbookMembers).values({
      id: uuidv4(),
      cookbookId,
      userId,
      role: 'owner',
      joinedAt: new Date(),
    });
  });

  return cookbookId;
}

export async function getCookbookById(cookbookId: string, userId: string): Promise<CookbookWithMembers | null> {
  // First get the cookbook and check if user has access
  const result = await db.select({
    cookbook: cookbooks,
    member: {
      id: cookbookMembers.id,
      userId: cookbookMembers.userId,
      role: cookbookMembers.role,
      joinedAt: cookbookMembers.joinedAt,
    },
    user: {
      id: users.id,
      email: users.email,
      name: users.name,
    },
  })
  .from(cookbooks)
  .leftJoin(cookbookMembers, eq(cookbooks.id, cookbookMembers.cookbookId))
  .leftJoin(users, eq(cookbookMembers.userId, users.id))
  .where(eq(cookbooks.id, cookbookId));

  if (result.length === 0) {
    return null;
  }

  const cookbook = result[0].cookbook;
  
  // Check if user has access to this cookbook
  const userMembership = result.find(r => r.member?.userId === userId);
  if (!userMembership?.member) {
    return null;
  }

  // Group members
  const members: CookbookMember[] = result
    .filter(r => r.member && r.user)
    .map(r => ({
      id: r.member!.id,
      userId: r.member!.userId,
      role: r.member!.role,
      joinedAt: r.member!.joinedAt,
      user: {
        id: r.user!.id,
        email: r.user!.email,
        name: r.user!.name,
      },
    }))
    .filter((member, index, self) => self.findIndex(m => m.id === member.id) === index);

  return {
    ...cookbook,
    members,
    userRole: userMembership.member.role,
  };
}

export async function getUserCookbooks(userId: string): Promise<CookbookWithMembers[]> {
  // First, get all cookbooks the user is a member of
  const userCookbooks = await db.select({
    cookbookId: cookbookMembers.cookbookId,
    userRole: cookbookMembers.role,
  })
  .from(cookbookMembers)
  .where(eq(cookbookMembers.userId, userId));

  if (userCookbooks.length === 0) {
    return [];
  }

  const cookbookIds = userCookbooks.map(uc => uc.cookbookId);

  // Then get all cookbook details with all members
  const result = await db.select({
    cookbook: cookbooks,
    member: {
      id: cookbookMembers.id,
      userId: cookbookMembers.userId,
      role: cookbookMembers.role,
      joinedAt: cookbookMembers.joinedAt,
    },
    user: {
      id: users.id,
      email: users.email,
      name: users.name,
    },
  })
  .from(cookbooks)
  .innerJoin(cookbookMembers, eq(cookbooks.id, cookbookMembers.cookbookId))
  .innerJoin(users, eq(cookbookMembers.userId, users.id))
  .where(inArray(cookbooks.id, cookbookIds))
  .orderBy(desc(cookbooks.updatedAt));

  // Group by cookbook
  const cookbookMap = new Map<string, any>();
  
  result.forEach(row => {
    const cookbookId = row.cookbook.id;
    
    if (!cookbookMap.has(cookbookId)) {
      // Find user's role in this cookbook
      const userCookbook = userCookbooks.find(uc => uc.cookbookId === cookbookId);
      
      cookbookMap.set(cookbookId, {
        ...row.cookbook,
        members: [],
        userRole: userCookbook?.userRole,
      });
    }
    
    const cookbook = cookbookMap.get(cookbookId);
    if (row.member && row.user) {
      const memberExists = cookbook.members.some((m: any) => m.id === row.member!.id);
      if (!memberExists) {
        cookbook.members.push({
          id: row.member.id,
          userId: row.member.userId,
          role: row.member.role,
          joinedAt: row.member.joinedAt,
          user: {
            id: row.user.id,
            email: row.user.email,
            name: row.user.name,
          },
        });
      }
    }
  });

  return Array.from(cookbookMap.values());
}

export async function getCookbookPendingInvitations(cookbookId: string, userId: string): Promise<CookbookInvitation[]> {
  // Check if user has permission to view invitations
  const cookbook = await getCookbookById(cookbookId, userId);
  if (!cookbook || !['owner', 'editor'].includes(cookbook.userRole)) {
    return []; // No permission
  }

  const result = await db.select({
    invitation: cookbookInvitations,
    cookbook: {
      id: cookbooks.id,
      title: cookbooks.title,
      description: cookbooks.description,
    },
    inviter: {
      id: users.id,
      email: users.email,
      name: users.name,
    },
  })
  .from(cookbookInvitations)
  .innerJoin(cookbooks, eq(cookbookInvitations.cookbookId, cookbooks.id))
  .innerJoin(users, eq(cookbookInvitations.inviterUserId, users.id))
  .where(and(
    eq(cookbookInvitations.cookbookId, cookbookId),
    eq(cookbookInvitations.status, 'pending')
  ))
  .orderBy(desc(cookbookInvitations.createdAt));

  return result.map(row => ({
    ...row.invitation,
    cookbook: row.cookbook,
    inviter: row.inviter,
  }));
}

export async function linkPendingInvitations(userId: string, email: string): Promise<void> {
  // Find all pending invitations for this email
  const pendingInvitations = await db.select()
    .from(cookbookInvitations)
    .where(and(
      eq(cookbookInvitations.inviteeEmail, email),
      eq(cookbookInvitations.status, 'pending'),
      eq(cookbookInvitations.inviteeUserId, null) // Not yet linked to a user
    ));

  // Link all pending invitations to the new user
  if (pendingInvitations.length > 0) {
    await db.update(cookbookInvitations)
      .set({ inviteeUserId: userId })
      .where(and(
        eq(cookbookInvitations.inviteeEmail, email),
        eq(cookbookInvitations.status, 'pending'),
        eq(cookbookInvitations.inviteeUserId, null)
      ));
  }
}

export async function resendCookbookInvitation(invitationId: string, userId: string): Promise<boolean> {
  // Get the invitation details
  const invitation = await db.select({
    invitation: cookbookInvitations,
    cookbook: {
      id: cookbooks.id,
      title: cookbooks.title,
      ownerId: cookbooks.ownerId,
    },
    inviter: {
      id: users.id,
      name: users.name,
      email: users.email,
    },
  })
  .from(cookbookInvitations)
  .innerJoin(cookbooks, eq(cookbookInvitations.cookbookId, cookbooks.id))
  .innerJoin(users, eq(cookbookInvitations.inviterUserId, users.id))
  .where(eq(cookbookInvitations.id, invitationId))
  .limit(1);

  if (invitation.length === 0) {
    return false; // Invitation not found
  }

  const inv = invitation[0];

  // Check if user has permission to resend (must be cookbook owner or editor)
  const userMembership = await db.select({ role: cookbookMembers.role })
    .from(cookbookMembers)
    .where(and(
      eq(cookbookMembers.cookbookId, inv.cookbook.id),
      eq(cookbookMembers.userId, userId)
    ))
    .limit(1);

  if (userMembership.length === 0 || !['owner', 'editor'].includes(userMembership[0].role)) {
    return false; // No permission to resend
  }

  // Check if invitation is still pending
  if (inv.invitation.status !== 'pending') {
    return false; // Can only resend pending invitations
  }

  // Check if invitee has an account
  const inviteeUser = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.email, inv.invitation.inviteeEmail))
    .limit(1);

  const hasAccount = inviteeUser.length > 0;
  const inviterName = inv.inviter.name || inv.inviter.email;

  try {
    console.log('Resending invitation email:', {
      inviteeEmail: inv.invitation.inviteeEmail,
      inviterName,
      cookbookTitle: inv.cookbook.title,
      role: inv.invitation.role,
      hasAccount
    });

    // Resend the invitation email
    await sendCookbookInvitationEmail(
      inv.invitation.inviteeEmail,
      inviterName,
      inv.cookbook.title,
      inv.invitation.role,
      inv.invitation.message || undefined,
      hasAccount
    );

    console.log('Invitation email resent successfully');
    return true;
  } catch (error) {
    console.error('Failed to resend invitation email:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return false;
  }
}

export async function updateCookbook(cookbookId: string, userId: string, data: UpdateCookbookData): Promise<boolean> {
  // Check if user has edit permissions
  const cookbook = await getCookbookById(cookbookId, userId);
  if (!cookbook || !['owner', 'editor'].includes(cookbook.userRole)) {
    return false;
  }

  const updateData = { ...data, updatedAt: new Date() };
  
  const [updatedCookbook] = await db.update(cookbooks)
    .set(updateData)
    .where(eq(cookbooks.id, cookbookId))
    .returning({ id: cookbooks.id });

  return !!updatedCookbook;
}

export async function deleteCookbook(cookbookId: string, userId: string): Promise<boolean> {
  // Only owner can delete cookbook
  const [deletedCookbook] = await db.delete(cookbooks)
    .where(and(eq(cookbooks.id, cookbookId), eq(cookbooks.ownerId, userId)))
    .returning({ id: cookbooks.id });

  return !!deletedCookbook;
}

// Recipe management in cookbooks
export async function addRecipeToCookbook(
  cookbookId: string,
  recipeId: string,
  userId: string,
  notes?: string
): Promise<string | null> {
  // Check if user has permission to add recipes
  const cookbook = await getCookbookById(cookbookId, userId);
  if (!cookbook || !['owner', 'editor', 'contributor'].includes(cookbook.userRole)) {
    return null;
  }

  // Check if recipe already exists in cookbook
  const existing = await db.select()
    .from(cookbookRecipes)
    .where(
      and(
        eq(cookbookRecipes.cookbookId, cookbookId),
        eq(cookbookRecipes.recipeId, recipeId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return null; // Recipe already in cookbook
  }

  // Simply link the existing recipe to the cookbook (no duplication)
  await db.insert(cookbookRecipes).values({
    id: uuidv4(),
    cookbookId,
    recipeId,
    addedByUserId: userId,
    notes,
    addedAt: new Date(),
  });

  return recipeId;
}

export async function forkRecipeForCookbook(
  cookbookId: string,
  originalRecipeId: string,
  userId: string,
  modifications?: Partial<CreateRecipeData>
): Promise<string | null> {
  // Check if user has permission to edit in this cookbook
  const cookbook = await getCookbookById(cookbookId, userId);
  if (!cookbook || !['owner', 'editor'].includes(cookbook.userRole)) {
    return null;
  }

  // Get the original recipe (this should work for any public recipe or recipe in the cookbook)
  const originalRecipe = await db.select()
    .from(recipes)
    .where(eq(recipes.id, originalRecipeId))
    .limit(1);

  if (originalRecipe.length === 0) {
    return null;
  }

  const recipe = originalRecipe[0];

  // Create a forked copy with modifications
  const forkedRecipeData: CreateRecipeData = {
    title: modifications?.title || recipe.title,
    description: modifications?.description || recipe.description,
    ingredients: modifications?.ingredients || recipe.ingredients,
    instructions: modifications?.instructions || recipe.instructions,
    servings: modifications?.servings || recipe.servings,
    yield: modifications?.yield || recipe.yield,
    cookTime: modifications?.cookTime || recipe.cookTime,
    prepTime: modifications?.prepTime || recipe.prepTime,
    totalTime: modifications?.totalTime || recipe.totalTime,
    restTime: modifications?.restTime || recipe.restTime,
    difficulty: modifications?.difficulty || recipe.difficulty,
    cuisine: modifications?.cuisine || recipe.cuisine,
    category: modifications?.category || recipe.category,
    diet: modifications?.diet || recipe.diet,
    imageUrl: modifications?.imageUrl || recipe.imageUrl,
    sourceUrl: modifications?.sourceUrl || recipe.sourceUrl,
    sourceAuthor: modifications?.sourceAuthor || recipe.sourceAuthor,
    equipment: modifications?.equipment || recipe.equipment,
    notes: modifications?.notes || recipe.notes,
    nutrition: modifications?.nutrition || recipe.nutrition,
  };

  const forkedRecipeId = await createRecipe(userId, forkedRecipeData);

  // Replace the original recipe link with the forked one in the cookbook
  await db.transaction(async (tx) => {
    // Remove the original recipe from cookbook
    await tx.delete(cookbookRecipes)
      .where(
        and(
          eq(cookbookRecipes.cookbookId, cookbookId),
          eq(cookbookRecipes.recipeId, originalRecipeId)
        )
      );

    // Add the forked recipe to cookbook
    await tx.insert(cookbookRecipes).values({
      id: uuidv4(),
      cookbookId,
      recipeId: forkedRecipeId,
      addedByUserId: userId,
      originalRecipeId: originalRecipeId,
      notes: `Forked from original recipe`, // Indicate this is a fork
      addedAt: new Date(),
    });
  });

  return forkedRecipeId;
}

export async function removeRecipeFromCookbook(
  cookbookRecipeId: string, 
  cookbookId: string, 
  userId: string
): Promise<boolean> {
  // Check permissions
  const cookbook = await getCookbookById(cookbookId, userId);
  if (!cookbook) return false;

  // Get the cookbook recipe entry
  const cookbookRecipe = await db.select()
    .from(cookbookRecipes)
    .where(and(
      eq(cookbookRecipes.id, cookbookRecipeId),
      eq(cookbookRecipes.cookbookId, cookbookId)
    ));

  if (cookbookRecipe.length === 0) return false;

  const entry = cookbookRecipe[0];

  // Check permissions: owner/editor can remove any recipe, contributor can only remove their own
  if (cookbook.userRole === 'reader') return false;
  if (cookbook.userRole === 'contributor' && entry.addedByUserId !== userId) return false;

  // Remove the cookbook recipe entry and the copied recipe
  await db.transaction(async (tx) => {
    await tx.delete(cookbookRecipes).where(eq(cookbookRecipes.id, cookbookRecipeId));
    await tx.delete(recipes).where(eq(recipes.id, entry.recipeId));
  });

  return true;
}

export async function getCookbookRecipes(cookbookId: string, userId: string): Promise<CookbookRecipe[]> {
  // Check access
  const cookbook = await getCookbookById(cookbookId, userId);
  if (!cookbook) return [];

  const result = await db.select({
    cookbookRecipe: cookbookRecipes,
    recipe: recipes,
    addedByUser: {
      id: users.id,
      email: users.email,
      name: users.name,
    },
  })
  .from(cookbookRecipes)
  .innerJoin(recipes, eq(cookbookRecipes.recipeId, recipes.id))
  .innerJoin(users, eq(cookbookRecipes.addedByUserId, users.id))
  .where(eq(cookbookRecipes.cookbookId, cookbookId))
  .orderBy(desc(cookbookRecipes.addedAt));

  return result.map(row => ({
    id: row.cookbookRecipe.id,
    cookbookId: row.cookbookRecipe.cookbookId,
    recipe: {
      ...row.recipe,
      tags: [], // We'll need to fetch tags separately if needed
    } as RecipeWithTags,
    addedByUserId: row.cookbookRecipe.addedByUserId,
    originalRecipeId: row.cookbookRecipe.originalRecipeId,
    notes: row.cookbookRecipe.notes,
    addedAt: row.cookbookRecipe.addedAt,
    addedByUser: row.addedByUser,
    canEdit: row.recipe.userId === userId, // User can edit if they own the recipe
    isOriginalOwner: row.recipe.userId === userId,
  }));
}

// Invitation system
export async function inviteUserToCookbook(
  cookbookId: string,
  inviterUserId: string,
  inviteeEmail: string,
  role: 'editor' | 'contributor' | 'reader',
  message?: string,
  expiresAt?: Date
): Promise<string | null> {
  // Check if inviter has permission (owner or editor)
  const cookbook = await getCookbookById(cookbookId, inviterUserId);
  if (!cookbook || !['owner', 'editor'].includes(cookbook.userRole)) {
    return null;
  }

  // Check if user is already a member
  const existingMember = cookbook.members.find(m => m.user.email === inviteeEmail);
  if (existingMember) {
    return null; // User is already a member
  }

  // Check if there's already a pending invitation
  const existingInvitation = await db.select()
    .from(cookbookInvitations)
    .where(and(
      eq(cookbookInvitations.cookbookId, cookbookId),
      eq(cookbookInvitations.inviteeEmail, inviteeEmail),
      eq(cookbookInvitations.status, 'pending')
    ));

  if (existingInvitation.length > 0) {
    return null; // Pending invitation already exists
  }

  // Find invitee user if they exist
  const inviteeUser = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.email, inviteeEmail));

  const invitationId = uuidv4();
  
  await db.insert(cookbookInvitations).values({
    id: invitationId,
    cookbookId,
    inviterUserId,
    inviteeEmail,
    inviteeUserId: inviteeUser[0]?.id || null,
    role,
    status: 'pending',
    message,
    createdAt: new Date(),
    expiresAt,
  });

  // Get cookbook and inviter details for the email
  const cookbookDetails = await getCookbookById(cookbookId, inviterUserId);
  const inviterUser = await db.select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, inviterUserId))
    .limit(1);

  if (cookbookDetails && inviterUser[0]) {
    const inviterName = inviterUser[0].name || inviterUser[0].email;
    const hasAccount = inviteeUser.length > 0;

    console.log('Preparing to send invitation email:', {
      inviteeEmail,
      inviterName,
      cookbookTitle: cookbookDetails.title,
      role,
      hasAccount
    });

    try {
      // Send invitation email
      await sendCookbookInvitationEmail(
        inviteeEmail,
        inviterName,
        cookbookDetails.title,
        role,
        message,
        hasAccount
      );
      console.log('Invitation email sent successfully');
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Log helpful message for testing mode
      if (error instanceof Error && error.message.includes('testing mode')) {
        console.log('💡 TIP: In Resend testing mode, try inviting: loganbunch@gmail.com');
      }
      
      // Don't fail the invitation creation if email fails
      // The invitation still exists in the database
    }
  } else {
    console.log('Skipping email send - missing cookbook details or inviter info:', {
      hasCookbookDetails: !!cookbookDetails,
      hasInviterUser: !!inviterUser[0]
    });
  }

  return invitationId;
}

export async function getUserInvitations(userId: string): Promise<CookbookInvitation[]> {
  const user = await db.select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId));

  if (user.length === 0) return [];

  const result = await db.select({
    invitation: cookbookInvitations,
    cookbook: {
      id: cookbooks.id,
      title: cookbooks.title,
      description: cookbooks.description,
    },
    inviter: {
      id: users.id,
      email: users.email,
      name: users.name,
    },
  })
  .from(cookbookInvitations)
  .innerJoin(cookbooks, eq(cookbookInvitations.cookbookId, cookbooks.id))
  .innerJoin(users, eq(cookbookInvitations.inviterUserId, users.id))
  .where(and(
    eq(cookbookInvitations.inviteeEmail, user[0].email),
    eq(cookbookInvitations.status, 'pending')
  ))
  .orderBy(desc(cookbookInvitations.createdAt));

  return result.map(row => ({
    ...row.invitation,
    cookbook: row.cookbook,
    inviter: row.inviter,
  }));
}

export async function respondToInvitation(
  invitationId: string,
  userId: string,
  response: 'accepted' | 'declined'
): Promise<boolean> {
  // Get the invitation
  const invitation = await db.select()
    .from(cookbookInvitations)
    .where(eq(cookbookInvitations.id, invitationId));

  if (invitation.length === 0) return false;

  const inv = invitation[0];

  // Verify the user is the intended recipient
  const user = await db.select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId));

  if (user.length === 0 || user[0].email !== inv.inviteeEmail) {
    return false;
  }

  if (response === 'accepted') {
    await db.transaction(async (tx) => {
      // Add user to cookbook members
      await tx.insert(cookbookMembers).values({
        id: uuidv4(),
        cookbookId: inv.cookbookId,
        userId,
        role: inv.role,
        joinedAt: new Date(),
      });

      // Update invitation status
      await tx.update(cookbookInvitations)
        .set({ status: 'accepted', inviteeUserId: userId })
        .where(eq(cookbookInvitations.id, invitationId));
    });
  } else {
    // Update invitation status
    await db.update(cookbookInvitations)
      .set({ status: 'declined' })
      .where(eq(cookbookInvitations.id, invitationId));
  }

  return true;
}

export async function removeMemberFromCookbook(
  cookbookId: string,
  memberUserId: string,
  requestingUserId: string
): Promise<boolean> {
  // Check permissions
  const cookbook = await getCookbookById(cookbookId, requestingUserId);
  if (!cookbook) return false;

  // Only owner can remove members, or users can remove themselves
  if (cookbook.userRole !== 'owner' && requestingUserId !== memberUserId) {
    return false;
  }

  // Cannot remove the owner
  if (memberUserId === cookbook.ownerId) {
    return false;
  }

  const [removedMember] = await db.delete(cookbookMembers)
    .where(and(
      eq(cookbookMembers.cookbookId, cookbookId),
      eq(cookbookMembers.userId, memberUserId)
    ))
    .returning({ id: cookbookMembers.id });

  return !!removedMember;
}

export async function updateMemberRole(
  cookbookId: string,
  memberUserId: string,
  newRole: 'editor' | 'contributor' | 'reader',
  requestingUserId: string
): Promise<boolean> {
  // Check permissions - only owner can change roles
  const cookbook = await getCookbookById(cookbookId, requestingUserId);
  if (!cookbook || cookbook.userRole !== 'owner') {
    return false;
  }

  // Cannot change owner's role
  if (memberUserId === cookbook.ownerId) {
    return false;
  }

  const [updatedMember] = await db.update(cookbookMembers)
    .set({ role: newRole })
    .where(and(
      eq(cookbookMembers.cookbookId, cookbookId),
      eq(cookbookMembers.userId, memberUserId)
    ))
    .returning({ id: cookbookMembers.id });

  return !!updatedMember;
}