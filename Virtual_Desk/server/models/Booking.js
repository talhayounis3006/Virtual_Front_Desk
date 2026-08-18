/**
 * ============================================================
 *  BOOKING MODEL — models/Booking.js
 * ============================================================
 *  Defines the "Booking" collection in MongoDB.
 *  A Booking represents an appointment a customer makes with a business.
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. References: `business` and `customer` are ObjectIds pointing to
 *     other collections (Business, User). This is how MongoDB links data.
 *  2. Enums: `status` field only allows specific string values.
 *  3. Indexes: `bookingSchema.index(...)` speeds up queries that filter
 *     by business + date (the most common query pattern).
 *  4. Payment fields: tracks Stripe session/payment IDs for online payments.
 * ============================================================
 */

// Mongoose: ODM for MongoDB
import mongoose from "mongoose";

/**
 * bookingSchema — defines the structure of a Booking document.
 * `timestamps: true` auto-adds createdAt & updatedAt.
 */
const bookingSchema = new mongoose.Schema(
  {
    // Which business this booking belongs to (reference to Business collection)
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    // Which registered user made the booking (optional — public bookings may not have an account)
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Customer details stored directly on the booking (denormalized)
    // This way we don't need to look up the User collection to display booking info
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: String,

    // The service being booked (stored as the service NAME string)
    service: { type: String, required: true },
    // Price of the service at time of booking
    price: { type: Number, default: 0 },
    // Optional deposit amount (if business requires a deposit)
    depositAmount: { type: Number, default: 0 },
    // Whether the deposit/full payment has been paid
    depositPaid: { type: Boolean, default: false },

    // When the appointment is scheduled
    date: { type: Date, required: true },   // the day (e.g., 2026-08-15)
    time: { type: String, required: true }, // the time (e.g., "14:30")
    duration: { type: Number, required: true }, // length in minutes

    // Booking lifecycle status
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "no-show"],
      default: "pending", // new bookings start as "pending"
    },

    // Which staff member is assigned to this appointment
    staff: { type: String, default: "" },
    // Optional notes from the customer or business
    notes: String,

    // Automation flags — used by the scheduler to avoid sending duplicate emails
    reviewRequested: { type: Boolean, default: false },   // has a review been requested?
    reviewSubmitted: { type: Boolean, default: false },   // has the customer submitted a review?
    reminderSent: { type: Boolean, default: false },      // has the reminder email been sent?
    reviewRequestSent: { type: Boolean, default: false }, // has the review request email been sent?

    // Stripe payment tracking
    stripeSessionId: { type: String, default: "" },       // Stripe Checkout session ID
    stripePaymentIntentId: { type: String, default: "" }, // Stripe PaymentIntent ID (after payment)
    // Capability token required to initiate payment for an unauthenticated booking.
    // It is returned only once, to the browser that created the booking.
    checkoutToken: { type: String, select: false },
  },
  { timestamps: true }
);

/**
 * INDEX — speeds up the most common query:
 * "Find all bookings for this business on this date"
 * Without an index, MongoDB would scan every document (slow on large datasets).
 */
bookingSchema.index({ business: 1, date: 1 });

// Register the schema as a Mongoose model named "Booking"
// This creates/uses the "bookings" collection in MongoDB
export default mongoose.model("Booking", bookingSchema);
