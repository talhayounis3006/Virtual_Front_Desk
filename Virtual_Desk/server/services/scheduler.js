/**
 * ============================================================
 *  SCHEDULER SERVICE — services/scheduler.js
 * ============================================================
 *  Runs automated background jobs using node-cron.
 *
 *  JOBS:
 *  1. Daily at 9:00 AM — Send appointment reminders for tomorrow's bookings
 *  2. Daily at 10:00 AM — Send review requests for yesterday's completed bookings
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. Cron Jobs: scheduled tasks that run at specific times.
 *     Format: "minute hour day-of-month month day-of-week"
 *     "0 9 * * *" = at 9:00 AM every day.
 *  2. Idempotency Flags: `reminderSent` and `reviewRequestSent` on the
 *     Booking model prevent duplicate emails if the job runs twice.
 *  3. Notification Logging: every email attempt is logged to the
 *     Notification collection (success or failure).
 *  4. Dev Mode: in development, jobs also run once after 5 seconds
 *     so you can test without waiting for the cron trigger.
 * ============================================================
 */

// node-cron: library for scheduling tasks
import cron from "node-cron";
// Models
import Booking from "../models/Booking.js";
import Business from "../models/Business.js";
import Notification from "../models/Notification.js";
// Email service
import { sendReminderEmail, sendReviewRequestEmail } from "./email.js";

/**
 * ─────────────────────────────────────────────
 *  JOB 1: Daily at 9:00 AM — Send appointment
 *          reminders for tomorrow's bookings
 * ─────────────────────────────────────────────
 *
 * Finds all confirmed/pending bookings for tomorrow where
 * reminderSent is false, then sends an email reminder.
 */
async function sendTomorrowReminders() {
  console.log("⏰ [Scheduler] Running tomorrow reminder job...");

  // Calculate tomorrow's date range (start of day to end of day)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startOfDay = new Date(tomorrow);
  startOfDay.setHours(0, 0, 0, 0); // 00:00:00
  const endOfDay = new Date(tomorrow);
  endOfDay.setHours(23, 59, 59, 999); // 23:59:59.999

  try {
    // Find bookings that:
    // - Are scheduled for tomorrow
    // - Are confirmed or pending (not cancelled)
    // - Haven't had a reminder sent yet (idempotency flag)
    const bookings = await Booking.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ["confirmed", "pending"] },
      reminderSent: false,
    }).populate("business", "name"); // include business name for the email

    console.log(`   Found ${bookings.length} booking(s) needing reminders`);

    // Send a reminder email for each booking
    for (const booking of bookings) {
      const businessName = booking.business?.name || "Our Business";
      const dateStr = booking.date.toISOString().split("T")[0];

      try {
        // Send the email
        await sendReminderEmail({
          to: booking.customerEmail,
          name: booking.customerName,
          businessName,
          service: booking.service,
          date: dateStr,
          time: booking.time,
        });

        // Mark reminder as sent (prevents duplicate emails on next run)
        booking.reminderSent = true;
        await booking.save();

        // Log the successful send to the Notification collection
        await Notification.create({
          booking: booking._id,
          business: booking.business?._id || booking.business,
          type: "reminder",
          channel: "email",
          recipient: {
            name: booking.customerName,
            email: booking.customerEmail,
            phone: booking.customerPhone,
          },
          status: "sent",
        });

        console.log(`   ✅ Reminder sent to ${booking.customerEmail} for ${dateStr} at ${booking.time}`);
      } catch (err) {
        console.error(`   ❌ Failed to send reminder to ${booking.customerEmail}:`, err.message);

        // Log the failure to the Notification collection
        await Notification.create({
          booking: booking._id,
          business: booking.business?._id || booking.business,
          type: "reminder",
          channel: "email",
          recipient: {
            name: booking.customerName,
            email: booking.customerEmail,
            phone: booking.customerPhone,
          },
          status: "failed",
          errorMessage: err.message,
        });
      }
    }
  } catch (err) {
    console.error("   ❌ Reminder job error:", err);
  }
}

/**
 * ─────────────────────────────────────────────
 *  JOB 2: Daily at 10:00 AM — Send review
 *          requests for yesterday's completed
 *          bookings
 * ─────────────────────────────────────────────
 *
 * Finds all bookings marked "completed" from
 * yesterday where reviewRequestSent is false,
 * then sends a review request email.
 */
async function sendReviewRequests() {
  console.log("⏰ [Scheduler] Running review request job...");

  // Calculate yesterday's date range
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const startOfDay = new Date(yesterday);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(yesterday);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    // Find bookings that:
    // - Were scheduled for yesterday
    // - Are marked "completed"
    // - Haven't had a review request sent yet
    const bookings = await Booking.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      status: "completed",
      reviewRequestSent: false,
    }).populate("business", "name slug");

    console.log(`   Found ${bookings.length} completed booking(s) needing review requests`);

    for (const booking of bookings) {
      const businessName = booking.business?.name || "Our Business";
      const businessSlug = booking.business?.slug || "";
      const dateStr = booking.date.toISOString().split("T")[0];

      // Placeholder review URL — replace with actual review page when built
      const reviewUrl = `https://frontdesk.app/review/${booking._id}`;

      try {
        // Send the review request email
        await sendReviewRequestEmail({
          to: booking.customerEmail,
          name: booking.customerName,
          businessName,
          service: booking.service,
          date: dateStr,
          reviewUrl,
        });

        // Mark review request as sent (prevents duplicates)
        booking.reviewRequestSent = true;
        booking.reviewRequested = true;
        await booking.save();

        // Log the successful send
        await Notification.create({
          booking: booking._id,
          business: booking.business?._id || booking.business,
          type: "review_request",
          channel: "email",
          recipient: {
            name: booking.customerName,
            email: booking.customerEmail,
            phone: booking.customerPhone,
          },
          status: "sent",
        });

        console.log(`   ✅ Review request sent to ${booking.customerEmail} for ${dateStr}`);
      } catch (err) {
        console.error(`   ❌ Failed to send review request to ${booking.customerEmail}:`, err.message);

        // Log the failure
        await Notification.create({
          booking: booking._id,
          business: booking.business?._id || booking.business,
          type: "review_request",
          channel: "email",
          recipient: {
            name: booking.customerName,
            email: booking.customerEmail,
            phone: booking.customerPhone,
          },
          status: "failed",
          errorMessage: err.message,
        });
      }
    }
  } catch (err) {
    console.error("   ❌ Review request job error:", err);
  }
}

/**
 * initScheduler — initializes all scheduled jobs.
 * Call this once when the server starts (from server.js).
 */
export function initScheduler() {
  console.log("⏰ Initializing scheduled jobs...");

  // Job 1: Reminders — every day at 9:00 AM
  // Cron format: "0 9 * * *" = minute 0, hour 9, every day
  cron.schedule("0 9 * * *", () => {
    sendTomorrowReminders();
  });

  // Job 2: Review requests — every day at 10:00 AM
  cron.schedule("0 10 * * *", () => {
    sendReviewRequests();
  });

  console.log("   ✅ Reminder job scheduled for 9:00 AM daily");
  console.log("   ✅ Review request job scheduled for 10:00 AM daily");

  // For development convenience, also run once immediately after a short delay
  // so you can test without waiting for the cron trigger.
  // Comment these out in production.
  if (process.env.NODE_ENV !== "production") {
    setTimeout(() => {
      console.log("⏰ [Dev] Running initial reminder job...");
      sendTomorrowReminders().then(() => {
        console.log("⏰ [Dev] Running initial review request job...");
        sendReviewRequests();
      });
    }, 5000); // wait 5 seconds after server start
  }
}