import bcrypt from 'bcryptjs';
import { db } from '~/db';
import { users, userSessions } from '~/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  name?: string;
  isSuperAdmin?: boolean;
}

export interface CreateUserData {
  email: string;
  password: string;
  name?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(userData: CreateUserData): Promise<User> {
  const existingUser = await db.select().from(users).where(eq(users.email, userData.email)).limit(1);
  
  if (existingUser.length > 0) {
    throw new Error('User already exists');
  }

  const passwordHash = await hashPassword(userData.password);
  
  const [newUser] = await db.insert(users).values({
    email: userData.email,
    passwordHash,
    name: userData.name,
  }).returning({
    id: users.id,
    email: users.email,
    name: users.name,
  });

  return newUser;
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  console.log('🔍 authenticateUser called:', { email, passwordLength: password.length });
  
  const [userRecord] = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    passwordHash: users.passwordHash,
    isSuperAdmin: users.isSuperAdmin,
  }).from(users).where(eq(users.email, email)).limit(1);

  if (!userRecord) {
    console.log('❌ No user found with email:', email);
    return null;
  }

  console.log('✅ User found:', {
    email: userRecord.email,
    hasPassword: !!userRecord.passwordHash,
    passwordHashStart: userRecord.passwordHash.substring(0, 10) + '...'
  });

  const isValid = await verifyPassword(password, userRecord.passwordHash);
  console.log('🔍 Password verification result:', isValid);
  
  if (!isValid) {
    console.log('❌ Password verification failed');
    return null;
  }

  const user = {
    id: userRecord.id,
    email: userRecord.email,
    name: userRecord.name,
    isSuperAdmin: Boolean(userRecord.isSuperAdmin),
  };

  // Debug logging
  console.log('🔍 authenticateUser result:', {
    email: user.email,
    isSuperAdmin: user.isSuperAdmin,
    rawIsSuperAdmin: userRecord.isSuperAdmin,
    type: typeof user.isSuperAdmin,
    fullUser: user,
    allKeys: Object.keys(user)
  });

  return user;
}

export async function createSession(userId: string): Promise<string> {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.insert(userSessions).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

export async function validateSession(token: string): Promise<User | null> {
  console.log('🔍 validateSession called with token:', token.substring(0, 8) + '...');
  
  try {
    const [session] = await db.select({
      userId: userSessions.userId,
      expiresAt: userSessions.expiresAt,
      id: users.id,
      email: users.email,
      name: users.name,
      isSuperAdmin: users.isSuperAdmin,
    })
    .from(userSessions)
    .innerJoin(users, eq(userSessions.userId, users.id))
    .where(and(
      eq(userSessions.token, token),
      gt(userSessions.expiresAt, new Date())
    ))
    .limit(1);

    if (!session) {
      console.log('❌ No session found for token:', token.substring(0, 8) + '...');
      
      // Debug: Check what tokens actually exist in Turso
      try {
        const allTokens = await db.select({ token: userSessions.token }).from(userSessions);
        console.log('🔍 Available tokens in Turso DB:', allTokens.map(t => t.token.substring(0, 8) + '...'));
        console.log('🔍 Total sessions in Turso:', allTokens.length);
      } catch (debugError) {
        console.log('❌ Error checking existing tokens:', debugError);
      }
      
      return null;
    }

    const user = {
      id: session.id,
      email: session.email,
      name: session.name,
      isSuperAdmin: Boolean(session.isSuperAdmin),
    };

    // Debug logging
    console.log('🔍 validateSession result:', {
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      rawIsSuperAdmin: session.isSuperAdmin,
      rawType: typeof session.isSuperAdmin,
      convertedType: typeof user.isSuperAdmin,
      fullUser: user,
      allKeys: Object.keys(user)
    });

    return user;
  } catch (error) {
    console.error('❌ Database error during session validation:', error);
    return null;
  }
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(userSessions).where(eq(userSessions.token, token));
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await db.delete(userSessions).where(eq(userSessions.userId, userId));
}