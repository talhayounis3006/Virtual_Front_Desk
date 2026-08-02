/**
 * ============================================================
 *  BUSINESS SETTINGS MODEL — models/BusinessSettings.js
 * ============================================================
 *  Defines the "BusinessSettings" collection in MongoDB.
 *  Stores configuration for a business that is separate from the
 *  main Business document — specifically:
 *    - Business hours (overrides the defaults on the Business model)
 *    - Blackout dates (days the business is closed, e.g., holidays)
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. One-to-One Relationship: each Business has exactly ONE settings document.
 *     The `unique: true` on `business` enforces this.
 *  2. Default Values: business hours have sensible defaults (9 AM - 6 PM weekdays).
 *  3. Nested Arrays: `blackoutDates` is an array of sub-documents.
 * ============================================================
 */

// Mongoose: ODM for MongoDB
import mongoose from "mongoose";

/**
 * businessSettingsSchema — defines the structure of a BusinessSettings document.
 */
const businessSettingsSchema = new mongoose.Schema(
  {
    // Reference to the Business this settings belong to
    // `unique: true` ensures one settings document per business
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      unique: true,
    },

    // Weekly business hours — these OVERRIDE the hours on the Business model
    // Default: Mon-Fri 9:00-18:00, Sat 9:00-17:00, Sun closed
    businessHours: {
      monday: { open: { type: String, default: "09:00" }, close: { type: String, default: "18:00" } },
      tuesday: { open: { type: String, default: "09:00" }, close: { type: String, default: "18:00" } },
      wednesday: { open: { type: String, default: "09:00" }, close: { type: String, default: "18:00" } },
      thursday: { open: { type: String, default: "09:00" }, close: { type: String, default: "18:00" } },
      friday: { open: { type: String, default: "09:00" }, close: { type: String, default: "18:00" } },
      saturday: { open: { type: String, default: "09:00" }, close: { type: String, default: "17:00" } },
      sunday: { open: { type: String, default: "" }, close: { type: String, default: "" } }, // closed
    },

    // Blackout dates — specific days the business is closed
    // Example: [{ date: 2026-12-25, reason: "Christmas Day" }]
    blackoutDates: [
      {
        date: { type: Date, required: true },
        reason: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

// Register the schema as a Mongoose model named "BusinessSettings"
// This creates/uses the "businesssettings" collection in MongoDB
export default mongoose.model("BusinessSettings", businessSettingsSchema);