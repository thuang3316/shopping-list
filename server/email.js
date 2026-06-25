// Email delivery for verification codes. Dev-mock first: when not in production
// (or no RESEND_API_KEY), the code is logged to the server console so signup
// can be built/tested without an email provider. See .claude/skills/email-verification.
import { Resend } from 'resend';

const isProd = process.env.NODE_ENV === 'production';

// The verified sender. Must be an address on a domain you've verified in Resend
// (e.g. "Swap <noreply@mail.hereweswap.com>"). Set EMAIL_FROM in prod; the
// resend.dev fallback only delivers to the Resend account owner, so it's for
// local/testing only.
const FROM = process.env.EMAIL_FROM || 'Swap <onboarding@resend.dev>';

// purpose: 'signup' (verify a new account) or 'reset' (password reset) — only
// changes the wording of the email; the delivery path is identical.
export async function deliverCode(email, code, purpose = 'signup') {
  // Dev (or any non-prod): log the code to the server console so the flows can
  // be built/tested without an email provider.
  if (!isProd) {
    console.log(`\n[dev] ${purpose} code for ${email}: ${code}\n`);
    return;
  }
  // Production must actually send. If the key is missing, fail loudly rather
  // than silently console-logging and returning 200 (which would make the flow
  // look successful while no email is ever delivered).
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set — cannot send verification email in production.');
  }
  const subject =
    purpose === 'reset' ? 'Reset your Swap password' : 'Your Swap verification code';
  const intro =
    purpose === 'reset'
      ? 'Use this code to reset your Swap password'
      : 'Your verification code';
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM,
    to: email,
    subject,
    html: `<p>${intro}: <strong style="font-size:20px">${code}</strong>.</p>
           <p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
  });
}

// Escape user-supplied text before putting it in an HTML email body, so a message
// can't inject markup into the owner's inbox. (deliverCode doesn't need this — it
// only interpolates a system-generated numeric code.)
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Send a user's feedback to the site owner. Same dev/prod split as deliverCode:
// non-prod logs to the console; prod sends via Resend to OWNER_EMAIL. Best-effort —
// the caller stores the feedback in the DB first and must not fail the request if
// this throws. Reply-To is the sender so a reply goes straight back to them.
export async function deliverFeedback({ message, category, fromEmail, fromUsername }) {
  if (!isProd) {
    console.log(`\n[dev] feedback (${category}) from ${fromUsername} <${fromEmail}>:\n${message}\n`);
    return;
  }
  const to = process.env.OWNER_EMAIL;
  if (!to) {
    console.error('[email] OWNER_EMAIL is not set — feedback stored but not emailed.');
    return;
  }
  if (!process.env.RESEND_API_KEY) {
    console.error('[email] RESEND_API_KEY is not set — feedback stored but not emailed.');
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM,
    to,
    replyTo: fromEmail,
    subject: `[Swap feedback] ${category} — from ${fromUsername}`,
    html: `<p><strong>${escapeHtml(fromUsername)}</strong> (${escapeHtml(fromEmail)}) sent feedback — <em>${escapeHtml(category)}</em>:</p>
           <p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
  });
}
