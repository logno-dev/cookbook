import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    console.log('Attempting to send email:', {
      to: options.to,
      subject: options.subject,
      from: options.from || 'Recipe Curator <onboarding@resend.dev>',
      hasApiKey: !!process.env.RESEND_API_KEY,
      apiKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 10) + '...'
    });

    const result = await resend.emails.send({
      from: options.from || 'Recipe Curator <no-reply@mail.bunch.codes>',
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log('Email sent successfully:', result);
  } catch (error) {
    console.error('Failed to send email:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    // Check if it's the testing limitation error
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as any).message;
      if (errorMessage?.includes('testing emails') || errorMessage?.includes('verify a domain')) {
        console.log('⚠️  RESEND TESTING MODE: You can only send emails to your verified email address');
        console.log('⚠️  To send to other emails, verify a domain at resend.com/domains');
        throw new Error('Resend is in testing mode - can only send to verified email address');
      }
    }
    
    throw new Error('Failed to send email');
  }
}

export function generateWelcomeEmail(name: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333; text-align: center;">Welcome to Recipe Curator!</h1>
      <p>Hi ${name || 'there'},</p>
      <p>Welcome to Recipe Curator! We're excited to help you organize and discover amazing recipes.</p>
      <p>You can now:</p>
      <ul>
        <li>Add recipes by pasting URLs from your favorite cooking websites</li>
        <li>Create recipes from scratch</li>
        <li>Organize recipes with tags</li>
        <li>Search through your recipe collection</li>
      </ul>
      <p>Happy cooking!</p>
      <p>Best regards,<br>The Recipe Curator Team</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="color: #6b7280; font-size: 12px; text-align: center;">
        This email was sent from Recipe Curator.<br>
        If you have any questions, please contact us.
      </p>
    </div>
  `;
}

export async function sendWelcomeEmail(email: string, name?: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Welcome to Recipe Curator!',
    html: generateWelcomeEmail(name || ''),
  });
}

export function generateCookbookInvitationEmail(
  inviterName: string,
  cookbookTitle: string,
  role: string,
  message?: string,
  hasAccount?: boolean
): string {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://bunch.codes' // Replace with your actual domain
    : 'http://localhost:3001';

  const actionText = hasAccount 
    ? 'View Invitation' 
    : 'Create Account & View Invitation';
  
  const actionUrl = hasAccount 
    ? `${baseUrl}/dashboard` 
    : `${baseUrl}/register`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #059669; text-align: center;">You're Invited to a Cookbook!</h1>
      
      <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="font-size: 16px; margin: 0 0 10px 0;">
          <strong>${inviterName}</strong> has invited you to collaborate on their cookbook:
        </p>
        <p style="font-size: 18px; font-weight: bold; color: #059669; margin: 10px 0;">
          "${cookbookTitle}"
        </p>
        <p style="font-size: 14px; color: #6b7280; margin: 0;">
          Role: ${role.charAt(0).toUpperCase() + role.slice(1)}
        </p>
      </div>

      ${message ? `
        <div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #059669; margin: 20px 0;">
          <p style="margin: 0; font-style: italic;">"${message}"</p>
        </div>
      ` : ''}

      ${!hasAccount ? `
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;">
            <strong>Note:</strong> You'll need to create an account first to access the cookbook.
          </p>
        </div>
      ` : ''}

      <div style="text-align: center; margin: 30px 0;">
        <a href="${actionUrl}" 
           style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          ${actionText}
        </a>
      </div>

      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        This invitation will expire in 7 days.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="color: #6b7280; font-size: 12px; text-align: center;">
        This invitation was sent by ${inviterName} through Recipe Curator.<br>
        If you don't want to receive invitations, you can ignore this email.
      </p>
    </div>
  `;
}

export async function sendCookbookInvitationEmail(
  inviteeEmail: string,
  inviterName: string,
  cookbookTitle: string,
  role: string,
  message?: string,
  hasAccount?: boolean
): Promise<void> {
  await sendEmail({
    to: inviteeEmail,
    subject: `You're invited to collaborate on "${cookbookTitle}" cookbook`,
    html: generateCookbookInvitationEmail(inviterName, cookbookTitle, role, message, hasAccount),
  });
}