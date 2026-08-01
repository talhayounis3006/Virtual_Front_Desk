import nodemailer from "nodemailer";

/**
 * Creates a reusable Nodemailer transporter.
 * Uses SMTP settings from environment variables.
 * Falls back to a dummy Ethereal test account if no SMTP is configured.
 */
let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Fallback: create Ethereal test account (emails are viewable at ethereal.email)
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
 * Send a booking reminder email.
 */
export async function sendReminderEmail({ to, name, businessName, service, date, time }) {
  const transport = await getTransporter();

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

  // Log Ethereal preview URL in development
  if (process.env.NODE_ENV !== "production") {
    console.log("📧 Reminder email preview:", nodemailer.getTestMessageUrl(info));
  }

  return info;
}

/**
 * Send a review request email.
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