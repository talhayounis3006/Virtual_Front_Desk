/**
 * ============================================================
 *  EMAIL SERVICE — services/email.js
 * ============================================================
 *  Handles sending automated emails using Nodemailer.
 *
 *  WHAT IT DOES:
 *  - Creates a reusable email transporter (SMTP connection)
 *  - sendReminderEmail: sends appointment reminder emails
 *  - sendReviewRequestEmail: sends review request emails
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. Transporter: a Nodemailer object that manages the SMTP connection.
 *     Created once and reused (singleton pattern).
 *  2. Ethereal Fallback: if no SMTP is configured, it uses Ethereal
 *     (a fake SMTP service) so you can preview emails in development.
 *  3. HTML Emails: emails are sent as HTML for nice formatting.
 * ============================================================
 */

// Nodemailer: the email sending library for Node.js
import nodemailer from "nodemailer";

/**
 * Transporter singleton — created lazily on first use.
 * `null` until getTransporter() is called.
 */
let transporter = null;

/**
 * getTransporter — creates (or returns) the email transporter.
 *
 * Two modes:
 * 1. Real SMTP: if SMTP_HOST and SMTP_USER are set in .env
 * 2. Ethereal test: creates a fake email account for development
 *    (emails are viewable at ethereal.email)
 */
async function getTransporter() {
  // If already created, reuse it (don't create a new connection each time)
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    // Real SMTP configuration from environment variables
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true", // true for port 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Fallback: create an Ethereal test account
    // Ethereal is a fake SMTP service — emails aren't actually delivered,
    // but you can view them at ethereal.email to preview the HTML.
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("📧 Using Ethereal test email account:", testAccount.user);
  }

  return transporter;
}

/**
 * sendReminderEmail — sends an appointment reminder email.
 * Used by the scheduler for tomorrow's bookings.
 *
 * @param {Object} params
 * @param {string} params.to — recipient email
 * @param {string} params.name — customer name
 * @param {string} params.businessName — business name
 * @param {string} params.service — service name
 * @param {string} params.date — appointment date
 * @param {string} params.time — appointment time
 */
export async function sendReminderEmail({ to, name, businessName, service, date, time }) {
  const transport = await getTransporter();

  // sendMail: sends the email with subject + HTML body
  const info = await transport.sendMail({
    from: `"${businessName}" <${process.env.SMTP_FROM || "noreply@frontdesk.app"}>`,
    to,
    subject: `Reminder: Your appointment at ${businessName} is tomorrow!`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Appointment Reminder</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>This is a friendly reminder that you have an appointment scheduled for <strong>tomorrow</strong>:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
          <tr><td style="padding: 0.5rem; border-bottom: 1px solid #eee; color: #666;">Business</td><td style="padding: 0.5rem; border-bottom: 1px solid #eee; font-weight: 600;">${businessName}</td></tr>
          <tr><td style="padding: 0.5rem; border-bottom: 1px solid #eee; color: #666;">Service</td><td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${service}</td></tr>
          <tr><td style="padding: 0.5rem; border-bottom: 1px solid #eee; color: #666;">Date</td><td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${date}</td></tr>
          <tr><td style="padding: 0.5rem; color: #666;">Time</td><td style="padding: 0.5rem; font-weight: 600;">${time}</td></tr>
        </table>
        <p style="color: #666; font-size: 0.85rem;">If you need to reschedule or cancel, please contact the business directly.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 1.5rem 0;" />
        <p style="color: #999; font-size: 0.75rem;">Sent by FrontDesk — Virtual Front Desk</p>
      </div>
    `,
  });

  // In development, log the Ethereal preview URL so you can view the email
  if (process.env.NODE_ENV !== "production") {
    console.log("📧 Reminder email preview:", nodemailer.getTestMessageUrl(info));
  }

  return info;
}

/**
 * sendReviewRequestEmail — sends a review request email.
 * Used by the scheduler for yesterday's completed bookings.
 *
 * @param {Object} params
 * @param {string} params.to — recipient email
 * @param {string} params.name — customer name
 * @param {string} params.businessName — business name
 * @param {string} params.service — service name
 * @param {string} params.date — appointment date
 * @param {string} params.reviewUrl — link to the review page
 */
export async function sendReviewRequestEmail({ to, name, businessName, service, date, reviewUrl }) {
  const transport = await getTransporter();

  const info = await transport.sendMail({
    from: `"${businessName}" <${process.env.SMTP_FROM || "noreply@frontdesk.app"}>`,
    to,
    subject: `How was your visit to ${businessName}? We'd love your feedback!`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">We Value Your Feedback</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Thank you for visiting <strong>${businessName}</strong> on ${date} for your ${service} appointment.</p>
        <p>We'd love to hear about your experience. Your feedback helps us improve and serve you better.</p>
        <div style="text-align: center; margin: 1.5rem 0;">
          <a href="${reviewUrl}" style="display: inline-block; padding: 0.7rem 1.5rem; background: #c9a96e; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Leave a Review
          </a>
        </div>
        <p style="color: #666; font-size: 0.85rem;">It only takes a minute and we truly appreciate it.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 1.5rem 0;" />
        <p style="color: #999; font-size: 0.75rem;">Sent by FrontDesk — Virtual Front Desk</p>
      </div>
    `,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("📧 Review request email preview:", nodemailer.getTestMessageUrl(info));
  }

  return info;
}