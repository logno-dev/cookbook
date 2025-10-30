import { APIEvent } from '@solidjs/start/server';
import { db } from '~/db';
import { users, passwordResetCodes } from '~/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { sendPasswordResetEmail } from '~/lib/email';

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(event: APIEvent) {
  try {
    const body = await event.request.json();
    const { email } = body;

    console.log('🔍 Password reset request for:', email);

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user exists
    const [user] = await db.select({ 
      id: users.id, 
      email: users.email, 
      name: users.name 
    }).from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      // For security, don't reveal whether the email exists or not
      // Return success but don't actually send an email
      console.log('❌ No user found with email:', email);
      return new Response(JSON.stringify({ 
        message: 'If an account with that email exists, you will receive a password reset code shortly.' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Clean up any existing unused password reset codes for this user
    await db.delete(passwordResetCodes).where(
      and(
        eq(passwordResetCodes.userId, user.id),
        eq(passwordResetCodes.isUsed, false)
      )
    );

    // Generate new verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Save the code to the database
    await db.insert(passwordResetCodes).values({
      userId: user.id,
      code,
      expiresAt,
      isUsed: false,
    });

    // Send email with verification code
    try {
      await sendPasswordResetEmail(user.email, code, user.name);
      console.log('✅ Password reset email sent to:', email);
    } catch (emailError) {
      console.error('❌ Failed to send password reset email:', emailError);
      
      // Clean up the code if email fails
      await db.delete(passwordResetCodes).where(
        and(
          eq(passwordResetCodes.userId, user.id),
          eq(passwordResetCodes.code, code)
        )
      );
      
      return new Response(JSON.stringify({ error: 'Failed to send password reset email' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      message: 'If an account with that email exists, you will receive a password reset code shortly.' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}