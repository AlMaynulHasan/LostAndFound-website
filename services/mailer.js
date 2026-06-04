const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/**
 * Send email notification
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @returns {Promise}
 */
async function sendMail(to, subject, html) {
  try {
    // Skip sending if email credentials are not configured
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      console.log('[EMAIL SKIPPED] No email credentials configured. Email not sent to:', to);
      return { success: false, message: 'Email service not configured' };
    }

    const info = await transporter.sendMail({
      from: process.env.MAIL_USER,
      to,
      subject,
      html,
    });

    console.log('[EMAIL SENT] Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL ERROR] Failed to send email to', to, ':', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send claim notification to item owner
 */
async function sendClaimNotification(ownerEmail, itemTitle, claimantName, dashboardLink) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Claim Notification - Lost2Found</h2>
      <p>Hi,</p>
      <p>Someone has claimed your item <strong>${itemTitle}</strong>.</p>
      <p><strong>Claimant Name:</strong> ${claimantName}</p>
      <p>Please review their claim and either accept or deny it in your dashboard:</p>
      <a href="${dashboardLink}" style="display: inline-block; background-color: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
        Review Claim
      </a>
      <p style="color: #999; margin-top: 30px; font-size: 12px;">
        This is an automated notification. Please do not reply to this email.
      </p>
    </div>
  `;
  return sendMail(ownerEmail, 'Someone claimed your item - Lost2Found', html);
}

/**
 * Send claim accepted notification to claimant
 */
async function sendClaimAcceptedNotification(claimantEmail, itemTitle) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">Claim Accepted! - Lost2Found</h2>
      <p>Hi,</p>
      <p>Great news! Your claim for <strong>${itemTitle}</strong> has been accepted.</p>
      <p>Please arrange to pick up your item within 72 hours. Contact the item owner for pickup details.</p>
      <p style="color: #999; margin-top: 30px; font-size: 12px;">
        This is an automated notification. Please do not reply to this email.
      </p>
    </div>
  `;
  return sendMail(claimantEmail, 'Your claim has been accepted - Lost2Found', html);
}

/**
 * Send claim denied notification to claimant
 */
async function sendClaimDeniedNotification(claimantEmail, itemTitle) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545;">Claim Not Accepted - Lost2Found</h2>
      <p>Hi,</p>
      <p>Unfortunately, your claim for <strong>${itemTitle}</strong> has not been accepted.</p>
      <p>You can view other items or report new items on Lost2Found.</p>
      <p style="color: #999; margin-top: 30px; font-size: 12px;">
        This is an automated notification. Please do not reply to this email.
      </p>
    </div>
  `;
  return sendMail(claimantEmail, 'Claim status update - Lost2Found', html);
}

/**
 * Send expiry reminder to item owner
 */
async function sendExpiryReminderNotification(ownerEmail, itemTitle, dashboardLink) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ffc107;">Item Expiring Soon - Lost2Found</h2>
      <p>Hi,</p>
      <p>Your post for <strong>${itemTitle}</strong> is expiring in 7 days.</p>
      <p>After 30 days, the item will be automatically archived. If you still need to find this item, please renew your post.</p>
      <a href="${dashboardLink}" style="display: inline-block; background-color: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
        View Dashboard
      </a>
      <p style="color: #999; margin-top: 30px; font-size: 12px;">
        This is an automated notification. Please do not reply to this email.
      </p>
    </div>
  `;
  return sendMail(ownerEmail, 'Your Lost2Found post expires in 7 days', html);
}

/**
 * Send post archived notification to item owner
 */
async function sendPostArchivedNotification(ownerEmail, itemTitle) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #666;">Item Post Archived - Lost2Found</h2>
      <p>Hi,</p>
      <p>Your post for <strong>${itemTitle}</strong> has been archived after 30 days without updates.</p>
      <p>You can create a new post anytime if you still need to find this item.</p>
      <p style="color: #999; margin-top: 30px; font-size: 12px;">
        This is an automated notification. Please do not reply to this email.
      </p>
    </div>
  `;
  return sendMail(ownerEmail, 'Your Lost2Found post has been archived', html);
}

module.exports = {
  sendMail,
  sendClaimNotification,
  sendClaimAcceptedNotification,
  sendClaimDeniedNotification,
  sendExpiryReminderNotification,
  sendPostArchivedNotification,
};
