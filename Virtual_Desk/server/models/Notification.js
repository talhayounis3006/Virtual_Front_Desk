/**
 * ============================================================
 *  NOTIFICATION MODEL — models/Notification.js
 * ============================================================
 *  Defines the "Notification" collection in MongoDB.
 *  Tracks every automated email/SMS sent by the system
 *  (appointment reminders, review requests).
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. Audit Trail: this collection is a log of ALL automated messages.
 *     It records whether each send succeeded or failed, and why.
 *  2. Enums: `type` (reminder/review_request) and `channel` (email/sms)
 *     restrict values to known options.
 *  3. Indexes: optimized for querying by booking+type and business+date.
 * ============================================================
 */

// Mongoose: ODM for MongoDB
import mongoose from "mongoose";

/**
 * notificationSchema — defines the structure of a Notification document.
 */
const notificationSchema = new mongoose.Schema(
  {
    // Which booking this notification relates to
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    // Which business the booking belongs to
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    // What kind of notification this is
    type: {
      type: String,
      enum: ["reminder", "review_request"], // reminder = appointment reminder, review_request = ask for feedback
      required: true,
    },
    // How it was delivered
    channel: {
      type: String,
      enum: ["email", "sms"],
      required: true,
    },
    // Who received it
    recipient: {
      name: { type: String, required: true },
      email: { type: String },
      phone: { type: String },
    },
    // Delivery status
    status: {
      type: String,
      enum: ["sent", "failed"],
      default: "sent",
    },
    // If failed, why? (stores the error message)
    errorMessage: { type: String, default: "" },
    // When it was sent
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index: "find all notifications for a booking of a certain type"
notificationSchema.index({ booking: 1, type: 1 });
// Index: "find all notifications for a business, newest first"
notificationSchema.index({ business: 1, sentAt: -1 });

// Register the schema as a Mongoose model named "Notification"
// This creates/uses the "notifications" collection in MongoDB
export default mongoose.model("Notification", notificationSchema);