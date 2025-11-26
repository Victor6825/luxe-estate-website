import { Resend } from '@resend/node';

const resendApiKey = process.env.RESEND_API_KEY || null;
const resendFrom = process.env.RESEND_FROM_EMAIL || 'no-reply@luxeestate.com';
const notificationRecipient = process.env.NOTIFY_EMAIL || process.env.RESEND_FROM_EMAIL;

let resendClient = null;

if (resendApiKey) {
  resendClient = new Resend(resendApiKey);
}

export async function sendSubmissionNotification(submission) {
  if (!resendClient || !notificationRecipient) {
    console.warn('Email notification skipped: RESEND_API_KEY or NOTIFY_EMAIL not set.');
    return;
  }

  const subject = `New ${submission.form_type || 'contact'} submission from ${submission.name}`;
  const body = `
    <h2>New Inquiry</h2>
    <ul>
      <li><strong>Name:</strong> ${submission.name}</li>
      <li><strong>Email:</strong> ${submission.email}</li>
      ${submission.phone ? `<li><strong>Phone:</strong> ${submission.phone}</li>` : ''}
      ${submission.service ? `<li><strong>Service:</strong> ${submission.service}</li>` : ''}
      <li><strong>Submitted:</strong> ${new Date().toLocaleString()}</li>
    </ul>
    ${submission.message ? `<p><strong>Message:</strong><br/>${submission.message.replace(/\n/g, '<br/>')}</p>` : ''}
  `;

  await resendClient.emails.send({
    from: resendFrom,
    to: notificationRecipient,
    subject,
    html: body,
  });
}

