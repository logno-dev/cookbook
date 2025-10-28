import bcrypt from 'bcryptjs';
import { db } from '~/db';
import { users, userSessions } from '~/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  name?: string;
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
  const [user] = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    passwordHash: users.passwordHash,
  }).from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
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
  const [session] = await db.select({
    userId: userSessions.userId,
    expiresAt: userSessions.expiresAt,
    user: {
      id: users.id,
      email: users.email,
      name: users.name,
    },
  })
  .from(userSessions)
  .innerJoin(users, eq(userSessions.userId, users.id))
  .where(and(
    eq(userSessions.token, token),
    gt(userSessions.expiresAt, new Date())
  ))
  .limit(1);

  if (!session) {
    return null;
  }

  return session.user;
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(userSessions).where(eq(userSessions.token, token));
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await db.delete(userSessions).where(eq(userSessions.userId, userId));
}