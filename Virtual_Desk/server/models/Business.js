/**
 * ============================================================
 *  BUSINESS MODEL — models/Business.js
 * ============================================================
 *  Defines the "Business" collection in MongoDB.
 *  A Business is a service provider (salon, clinic, gym, etc.)
 *  that uses the Virtual Front Desk platform.
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. Nested Schemas: `serviceSchema` is embedded INSIDE the business
 *     document (not a separate collection). This is called "denormalization".
 *  2. Pre-save Hook: automatically generates a URL-friendly "slug"
 *     from the business name (e.g., "Glamour Studio" → "glamour-studio").
 *  3. Business Hours: stored as an object with one key per day of the week.
 * ============================================================
 */

// Mongoose: ODM for MongoDB
import mongoose from "mongoose";

/**
 * serviceSchema — defines a single service a business offers.
 * This is a NESTED schema: services are stored inside the business document
 * as an array, rather than in a separate collection.
 *
 * Example:
 * {
 *   name: "Haircut",
 *   duration: 60,   // minutes
 *   price: 55,      // dollars
 *   description: "Wash, cut & style"
 * }
 */
const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  duration: { type: Number, required: true }, // length in minutes
  price: { type: Number, required: true },    // price in dollars
  description: String,
});

/**
 * businessSchema — defines the structure of a Business document.
 */
const businessSchema = new mongoose.Schema(
  {
    // The user who owns this business (reference to User collection)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Business display name
    name: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
    },
    // URL-friendly identifier (e.g., "glamour-studio")
    // Used in public booking URLs: /book/glamour-studio
    slug: {
      type: String,
      unique: true, // no two businesses can have the same slug
      lowercase: true,
    },
    // Short description shown on the public booking page
    description: String,
    // Business category — determines which industry the business is in
    category: {
      type: String,
      enum: ["salon", "clinic", "gym", "tutoring", "agency", "other"],
      default: "other",
    },
    // Array of services this business offers (nested documents)
    services: [serviceSchema],
    // Weekly business hours — one entry per day
    // Each day has { open: "09:00", close: "18:00" }
    // Empty strings mean the business is closed that day
    businessHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String },
    },
    // Contact information
    address: String,
    phone: String,
    email: String,

    // Feature toggles
    aiEnabled: { type: Boolean, default: true },        // is the AI chat assistant on?
    reviewAutomation: { type: Boolean, default: true }, // auto-send review requests?

    // Subscription/plan info
    subscription: {
      plan: { type: String, enum: ["free", "starter", "pro"], default: "free" },
      expiresAt: Date,
    },
  },
  { timestamps: true }
);

/**
 * PRE-SAVE HOOK — auto-generate a slug from the business name.
 * Runs automatically BEFORE saving a new business.
 *
 * Example: "Glamour Studio!" → "glamour-studio"
 * 1. toLowerCase() → "glamour studio!"
 * 2. replace(/[^a-z0-9]+/g, "-") → "glamour-studio-"
 * 3. replace(/(^-|-$)/g, "") → "glamour-studio"
 */
businessSchema.pre("save", function (next) {
  // Only generate if no slug was provided
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()                    // "Glamour Studio" → "glamour studio"
      .replace(/[^a-z0-9]+/g, "-")      // non-alphanumeric → "-"
      .replace(/(^-|-$)/g, "");         // remove leading/trailing "-"
  }
  next();
});

// Register the schema as a Mongoose model named "Business"
// This creates/uses the "businesses" collection in MongoDB
export default mongoose.model("Business", businessSchema);