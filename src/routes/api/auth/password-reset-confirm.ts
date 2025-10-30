import { APIEvent } from '@solidjs/start/server';
import { db } from '~/db';
import { users, passwordResetCodes, userSessions } from '~/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { hashPassword } from '~/lib/auth';

export async function POST(event: APIEvent) {
  try {
    const body = await event.request.json();
    const { email, code, newPassword } = body;

    console.log('🔍 Password reset confirmation for:', email);

    if (!email || !code || !newPassword) {
      return new Response(JSON.stringify({ error: 'Email, code, and new password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (newPassword.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters long' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find the user
    const [user] = await db.select({ 
      id: users.id, 
      email: users.email 
    }).from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      console.log('❌ No user found with email:', email);
      return new Response(JSON.stringify({ error: 'Invalid verification code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find valid password reset code
    const [resetCode] = await db.select()
      .from(passwordResetCodes)
      .where(
        and(
          eq(passwordResetCodes.userId, user.id),
          eq(passwordResetCodes.code, code),
          eq(passwordResetCodes.isUsed, false),
          gt(passwordResetCodes.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!resetCode) {
      console.log('❌ Invalid or expired reset code for user:', email);
      return new Response(JSON.stringify({ error: 'Invalid or expired verification code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Hash the new password
    const passwordHash = await hashPassword(newPassword);

    // Update the user's password
    await db.update(users)
      .set({ 
        passwordHash,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    // Mark the reset code as used
    await db.update(passwordResetCodes)
      .set({ isUsed: true })
      .where(eq(passwordResetCodes.id, resetCode.id));

    // Delete all existing sessions for this user (force re-login)
    await db.delete(userSessions).where(eq(userSessions.userId, user.id));

    console.log('✅ Password reset successful for:', email);

    return new Response(JSON.stringify({ 
      message: 'Password has been reset successfully. Please log in with your new password.' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Password reset confirmation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}