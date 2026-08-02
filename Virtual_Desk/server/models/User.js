/**
 * ============================================================
 *  USER MODEL — models/User.js
 * ============================================================
 *  Defines the "User" collection in MongoDB.
 *  A User can be:
 *    - "owner"   → owns a business (has a dashboard)
 *    - "staff"   → works at a business (can manage bookings)
 *    - "customer"→ books appointments (public user)
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. Mongoose Schema: defines the shape/structure of documents in a collection
 *  2. Middleware (pre-save hook): runs code BEFORE saving to DB — used here
 *     to hash passwords so plain-text passwords are NEVER stored
 *  3. Instance Methods: functions available on each document (e.g., user.comparePassword())
 *  4. JWT (JSON Web Token): a signed token that proves who the user is
 * ============================================================
 */

// Mongoose: ODM for MongoDB
import mongoose from "mongoose";
// bcryptjs: password hashing library (one-way encryption)
import bcrypt from "bcryptjs";
// jsonwebtoken: creates/signs JWT tokens for authentication
import jwt from "jsonwebtoken";

/**
 * userSchema — defines the structure of a User document.
 * `timestamps: true` automatically adds `createdAt` and `updatedAt` fields.
 */
const userSchema = new mongoose.Schema(
  {
    // User's full name
    name: {
      type: String,
      required: [true, "Name is required"], // error message if missing
      trim: true, // removes whitespace from both ends
    },
    // User's email — must be unique in the database
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, // MongoDB enforces no duplicates
      lowercase: true, // always store as lowercase
      trim: true,
    },
    // User's password
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6, // minimum 6 characters
      select: false, // ⚠️ IMPORTANT: don't return password in queries by default
    },
    // User's role determines what they can do in the app
    role: {
      type: String,
      enum: ["owner", "staff", "customer"], // only these values allowed
      default: "customer",
    },
    // Reference to the Business this user belongs to (for owner/staff)
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business", // tells Mongoose which collection to reference
    },
    // Optional phone number
    phone: String,
  },
  { timestamps: true } // auto-add createdAt & updatedAt
);

/**
 * PRE-SAVE MIDDLEWARE (Hook)
 * Runs automatically BEFORE every `save()` call on a User document.
 *
 * WHY: We never want to store plain-text passwords. If the database is
 * ever compromised, hashed passwords are useless to attackers.
 *
 * HOW: bcrypt.hash(password, 12) — the "12" is the salt rounds.
 * Higher = more secure but slower. 12 is a good balance.
 */
userSchema.pre("save", async function (next) {
  // `this` refers to the user document being saved
  // Only hash if the password was actually changed (not on every save)
  if (!this.isModified("password")) return next();
  // Replace the plain password with its hash
  this.password = await bcrypt.hash(this.password, 12);
  next(); // continue with the save operation
});

/**
 * INSTANCE METHOD: comparePassword
 * Used during login to check if the entered password matches the stored hash.
 *
 * `this.password` is available here because we used `.select("+password")`
 * when querying the user during login.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  // bcrypt.compare hashes the candidate and compares it to the stored hash
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * INSTANCE METHOD: generateToken
 * Creates a signed JWT that the client stores and sends with each request.
 *
 * The token contains:
 *  - id: the user's MongoDB _id (so we can look them up)
 *  - role: their role (so we can authorize actions)
 *
 * The token is signed with JWT_SECRET (from .env) so it can't be forged.
 * It expires after JWT_EXPIRE (e.g., "7d" = 7 days).
 */
userSchema.methods.generateToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role }, // payload (data inside the token)
    process.env.JWT_SECRET,            // secret key to sign it
    {
      expiresIn: process.env.JWT_EXPIRE, // e.g., "7d"
    }
  );
};

// Register the schema as a Mongoose model named "User"
// This creates/uses the "users" collection in MongoDB
export default mongoose.model("User", userSchema);