// Email delivery for verification codes. Dev-mock first: when not in production
// (or no RESEND_API_KEY), the code is logged to the server console so signup
// can be built/tested without an email provider. See .claude/skills/email-verification.
import { Resend } from 'resend';

const isProd = process.env.NODE_ENV === 'production';

export async function deliverCode(email, code) {
  // Dev (or any non-prod): log the code to the server console so signup can be
  // built/tested without an email provider.
  if (!isProd) {
    console.log(`\n[dev] verification code for ${email}: ${code}\n`);
    return;
  }
  // Production must actually send. If the key is missing, fail loudly rather
  // than silently console-logging and returning 200 (which would make signup
  // look successful while no email is ever delivered).
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set — cannot send verification email in production.');
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: 'Swap <onboarding@resend.dev>', // replace with a verified domain before prod
    to: email,
    subject: 'Your Swap verification code',
    html: `<p>Your verification code is <strong style="font-size:20px">${code}</strong>.</p>
           <p>It expires in 10 minutes.</p>`,
  });
}
